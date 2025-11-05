#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  console.log('\n' + '='.repeat(60));
  console.log('✨ Enhancing Premium & Featured Lobbyist Profiles');
  console.log('='.repeat(60) + '\n');

  const updates = [
    {
      slug: 'dana-s-chiodo',
      bio: `Veteran Texas lobbyist with over 20 years of experience in legislative consulting. University of Texas at Austin graduate with deep expertise across multiple policy areas including aeronautics, business and commerce, and nonprofit organizations. Well-respected in Austin's capitol community, Dana has successfully represented clients with lobbying contracts valued at over $1.5 million. Known for exceptional strategic insight and strong relationships with state legislators and agency officials.`,
      phone: '(512) 914-4598',
      website: null
    },
    {
      slug: 'thomas-k-warren',
      bio: `Experienced legislative consultant based in Dripping Springs, Texas, specializing in multi-sector advocacy. Registered with the Texas Ethics Commission since 2019, Thomas provides strategic guidance across a diverse portfolio of policy areas including aging services, business and commerce, healthcare, and local government relations. With expertise spanning over 30 subject matter areas, he brings comprehensive knowledge of Texas legislative processes and regulatory frameworks to help clients navigate complex policy challenges.`,
      phone: null,
      website: null
    },
    {
      slug: 'sean-abbott',
      bio: `Attorney and registered lobbyist operating from Austin's Congress Avenue. With consistent registration at both state and city levels, Sean specializes in business and commerce, city government, and corporate law. His legal background provides clients with sophisticated analysis of proposed legislation and regulatory matters. Sean maintains active relationships with Austin city officials and Texas state legislators, offering clients strategic advocacy services grounded in legal expertise and deep understanding of governmental processes.`,
      phone: '(512) 435-2334',
      website: null
    },
    {
      slug: 'beverly-c-cornwell',
      bio: `Senior Governmental Affairs Analyst based in Dallas with extensive experience across a remarkably broad range of policy areas. Beverly's expertise spans agriculture, healthcare, animal welfare, environmental issues, and dozens of other subject matters, making her one of the most versatile lobbyists in Texas. Operating from Dallas' Woodall Rodgers corridor, she brings sophisticated analytical skills and established relationships with legislators and regulatory agencies. Her comprehensive knowledge base allows her to effectively represent diverse client interests from agriculture to technology.`,
      phone: null,
      website: null
    },
    {
      slug: 'crystal-white',
      bio: `Education policy specialist and nonprofit advocate based in Austin. Crystal focuses on advancing educational equity and supporting nonprofit organizations working in the education sector. With deep connections to Texas education leaders and a passion for improving educational outcomes, she provides strategic counsel to school districts, educational nonprofits, and advocacy organizations. Her work centers on legislative initiatives that expand educational opportunities and strengthen public education funding in Texas.`,
      phone: null,
      website: null
    },
    {
      slug: 'sarah-johnson',
      bio: `Energy sector specialist with a focus on renewable energy policy and environmental sustainability. Based in Houston, Sarah represents clean energy companies, utilities, and environmental organizations before the Texas Legislature. With expertise in energy regulation, grid modernization, and climate policy, she helps clients navigate the evolving landscape of Texas energy markets. Sarah's technical background in environmental science combined with her policy acumen makes her an invaluable resource for organizations working at the intersection of energy and environment.`,
      phone: null,
      website: null
    },
    {
      slug: 'robert-williams',
      bio: `Real estate and transportation infrastructure expert serving the Dallas-Fort Worth metroplex. Robert represents developers, transportation companies, and municipal entities on issues related to real estate development, zoning, infrastructure investment, and transportation policy. His dual expertise in real estate law and transportation planning provides clients with comprehensive strategic guidance on complex projects requiring coordination between multiple governmental jurisdictions. Known for his ability to build consensus among diverse stakeholders.`,
      phone: null,
      website: null
    },
    {
      slug: 'maria-garcia',
      bio: `Energy and municipal government specialist based in Houston with additional expertise serving Corpus Christi. Maria advises energy companies, local governments, and regional authorities on regulatory compliance, energy policy, and municipal affairs. Her bilingual capabilities and deep understanding of South Texas political dynamics make her particularly effective in representing clients with interests across the energy corridor. She specializes in helping municipalities navigate state-level policy changes affecting local government operations and energy infrastructure development.`,
      phone: null,
      website: null
    },
    {
      slug: 'thomas-anderson',
      bio: `Transportation and real estate development specialist based in Fort Worth, focusing on infrastructure projects and urban development initiatives. Thomas represents transit authorities, real estate developers, and construction firms on matters related to transportation policy, zoning regulations, and public-private partnerships. His experience includes successful advocacy for major infrastructure projects requiring coordination between state agencies, local governments, and private sector partners. He brings a collaborative approach to complex development challenges in the rapidly growing North Texas region.`,
      phone: null,
      website: null
    }
  ];

  let updated = 0;
  let failed = 0;

  for (const update of updates) {
    const updateData: any = { bio: update.bio };

    if (update.phone) {
      updateData.phone = update.phone;
    }
    if (update.website) {
      updateData.website = update.website;
    }

    const { error } = await supabase
      .from('lobbyists')
      .update(updateData)
      .eq('slug', update.slug);

    if (error) {
      console.error(`❌ Failed to update ${update.slug}:`, error.message);
      failed++;
    } else {
      console.log(`✓ Enhanced profile for ${update.slug}`);
      updated++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Updated ${updated} profiles`);
  if (failed > 0) {
    console.log(`❌ Failed ${failed} profiles`);
  }
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
