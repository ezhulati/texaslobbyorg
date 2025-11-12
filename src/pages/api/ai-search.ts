/**
 * AI-Powered Lobbyist Search API
 * Uses Claude to understand natural language queries and match with lobbyists
 */

import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { query } = await request.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get available options from database
    const [citiesResult, subjectsResult] = await Promise.all([
      supabase.from('cities').select('name').order('name'),
      supabase.from('subject_areas').select('name').order('name'),
    ]);

    const cities = citiesResult.data || [];
    const subjects = subjectsResult.data || [];

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: import.meta.env.ANTHROPIC_API_KEY,
    });

    // Step 1: Extract search criteria from natural language
    const extractionResponse = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      tools: [
        {
          name: 'extract_search_criteria',
          description:
            'Extract lobbyist search criteria from a natural language query',
          input_schema: {
            type: 'object',
            properties: {
              cities: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Cities mentioned in the query. Match to available cities.',
              },
              subject_areas: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Policy areas, expertise, or industries mentioned. Match to available subject areas.',
              },
              keywords: {
                type: 'string',
                description:
                  'Additional context keywords or specific requirements that might help match lobbyists',
              },
            },
            required: ['cities', 'subject_areas', 'keywords'],
          },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `You are a lobbyist matching assistant. Extract search criteria from this query: "${query}"

Available cities in Texas: ${cities.map((c) => c.name).join(', ')}

Available expertise areas: ${subjects.map((s) => s.name).join(', ')}

Important instructions:
- Match city names EXACTLY to available cities (case-insensitive)
- Match expertise to available subject areas as closely as possible
- If no cities mentioned, return empty array
- If expertise spans multiple areas, include all relevant ones
- Extract any specific keywords about their needs or situation

Call the extract_search_criteria tool with your findings.`,
        },
      ],
    });

    // Extract tool call results
    const toolUse = extractionResponse.content.find(
      (block) => block.type === 'tool_use'
    );

    if (!toolUse || toolUse.type !== 'tool_use') {
      return new Response(
        JSON.stringify({ error: 'Failed to extract search criteria' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const searchParams = toolUse.input as {
      cities: string[];
      subject_areas: string[];
      keywords: string;
    };

    // Step 2: Intelligent search cascade - always returns results
    // Progressively relaxes constraints until we find matches
    let lobbyists: any[] = [];
    let searchMethod = '';

    // Try 1: Full search (keywords + geo + subjects)
    if (searchParams.keywords || searchParams.cities.length > 0 || searchParams.subject_areas.length > 0) {
      const { data, error } = await supabase.rpc('search_lobbyists', {
        search_query: searchParams.keywords || null,
        city_filters: searchParams.cities.length > 0 ? searchParams.cities : null,
        subject_filters: searchParams.subject_areas.length > 0 ? searchParams.subject_areas : null,
        tier_filter: null,
        client_filters: null,
        limit_count: 20,
        offset_count: 0,
      });

      if (!error && data && data.length > 0) {
        lobbyists = data;
        searchMethod = 'full_match';
      }
    }

    // Try 2: Geo + Subjects (drop keywords - might be too specific)
    if (lobbyists.length === 0 && (searchParams.cities.length > 0 || searchParams.subject_areas.length > 0)) {
      const { data, error } = await supabase.rpc('search_lobbyists', {
        search_query: null,
        city_filters: searchParams.cities.length > 0 ? searchParams.cities : null,
        subject_filters: searchParams.subject_areas.length > 0 ? searchParams.subject_areas : null,
        tier_filter: null,
        client_filters: null,
        limit_count: 20,
        offset_count: 0,
      });

      if (!error && data && data.length > 0) {
        lobbyists = data;
        searchMethod = 'geo_subject_match';
      }
    }

    // Try 3: Just geo (location matters most)
    if (lobbyists.length === 0 && searchParams.cities.length > 0) {
      const { data, error } = await supabase.rpc('search_lobbyists', {
        search_query: null,
        city_filters: searchParams.cities,
        subject_filters: null,
        tier_filter: null,
        client_filters: null,
        limit_count: 20,
        offset_count: 0,
      });

      if (!error && data && data.length > 0) {
        lobbyists = data;
        searchMethod = 'geo_only';
      }
    }

    // Try 4: Just subjects (expertise matters)
    if (lobbyists.length === 0 && searchParams.subject_areas.length > 0) {
      const { data, error } = await supabase.rpc('search_lobbyists', {
        search_query: null,
        city_filters: null,
        subject_filters: searchParams.subject_areas,
        tier_filter: null,
        client_filters: null,
        limit_count: 20,
        offset_count: 0,
      });

      if (!error && data && data.length > 0) {
        lobbyists = data;
        searchMethod = 'subject_only';
      }
    }

    // Try 5: Top-rated lobbyists (always works - guaranteed results)
    if (lobbyists.length === 0) {
      const { data, error } = await supabase.rpc('search_lobbyists', {
        search_query: null,
        city_filters: null,
        subject_filters: null,
        tier_filter: null,
        client_filters: null,
        limit_count: 20,
        offset_count: 0,
      });

      if (!error && data && data.length > 0) {
        lobbyists = data;
        searchMethod = 'top_rated';
      }
    }

    // Final safety check - should never happen
    if (!lobbyists || lobbyists.length === 0) {
      console.error('Critical: No lobbyists found even in fallback');
      return new Response(
        JSON.stringify({
          error: 'No lobbyists available in the directory',
          extracted_criteria: searchParams,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Generate AI explanations for top matches
    const topMatches = lobbyists.slice(0, 10);

    const resultsWithExplanations = await Promise.all(
      topMatches.map(async (lobbyist) => {
        try {
          const explanationResponse = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 150,
            messages: [
              {
                role: 'user',
                content: `User is looking for: "${query}"

Lobbyist profile:
- Name: ${lobbyist.first_name} ${lobbyist.last_name}
- Cities: ${lobbyist.cities?.join(', ') || 'Not specified'}
- Expertise: ${lobbyist.subject_areas?.join(', ') || 'Not specified'}
- Tier: ${lobbyist.subscription_tier}

In ONE concise sentence, explain why this lobbyist is a good match for the user's needs. Focus on relevant expertise and location. Be specific and professional.`,
              },
            ],
          });

          const explanation =
            explanationResponse.content[0].type === 'text'
              ? explanationResponse.content[0].text
              : 'Matches your search criteria.';

          return {
            id: lobbyist.id,
            first_name: lobbyist.first_name,
            last_name: lobbyist.last_name,
            slug: lobbyist.slug,
            bio: lobbyist.bio,
            profile_image_url: lobbyist.profile_image_url,
            cities: lobbyist.cities,
            subject_areas: lobbyist.subject_areas,
            subscription_tier: lobbyist.subscription_tier,
            ai_explanation: explanation,
          };
        } catch (error) {
          console.error('Error generating explanation:', error);
          return {
            id: lobbyist.id,
            first_name: lobbyist.first_name,
            last_name: lobbyist.last_name,
            slug: lobbyist.slug,
            bio: lobbyist.bio,
            profile_image_url: lobbyist.profile_image_url,
            cities: lobbyist.cities,
            subject_areas: lobbyist.subject_areas,
            subscription_tier: lobbyist.subscription_tier,
            ai_explanation: 'Matches your search criteria.',
          };
        }
      })
    );

    return new Response(
      JSON.stringify({
        results: resultsWithExplanations,
        extracted_criteria: searchParams,
        total_matches: lobbyists.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('AI search error:', error);
    return new Response(
      JSON.stringify({
        error: 'An error occurred processing your search',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
