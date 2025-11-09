import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

interface Testimonial {
  id: string;
  client_name: string;
  client_company?: string;
  client_title?: string;
  testimonial_text: string;
  rating?: number;
  created_at: string;
}

interface TestimonialsDisplayProps {
  lobbyistId: string;
}

export default function TestimonialsDisplay({ lobbyistId }: TestimonialsDisplayProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTestimonials();
  }, [lobbyistId]);

  const fetchTestimonials = async () => {
    try {
      const response = await fetch(`/api/testimonials/list?lobbyist_id=${lobbyistId}`);
      const data = await response.json();

      if (data.success) {
        setTestimonials(data.testimonials);
      } else {
        setError(data.error || 'Failed to load testimonials');
      }
    } catch (err) {
      setError('Failed to load testimonials');
      console.error('Error fetching testimonials:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-texas-blue-500 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading testimonials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <p>{error}</p>
      </div>
    );
  }

  if (testimonials.length === 0) {
    return null; // Don't show section if no testimonials
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Client Testimonials</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Rating */}
            {testimonial.rating && (
              <div className="mb-3 flex gap-1">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`h-5 w-5 ${
                      index < testimonial.rating!
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Testimonial Text */}
            <blockquote className="mb-4 text-gray-700 italic leading-relaxed">
              "{testimonial.testimonial_text}"
            </blockquote>

            {/* Client Info */}
            <div className="border-t border-gray-200 pt-4">
              <p className="font-semibold text-gray-900">{testimonial.client_name}</p>
              {testimonial.client_title && testimonial.client_company && (
                <p className="text-sm text-gray-600">
                  {testimonial.client_title} at {testimonial.client_company}
                </p>
              )}
              {testimonial.client_title && !testimonial.client_company && (
                <p className="text-sm text-gray-600">{testimonial.client_title}</p>
              )}
              {!testimonial.client_title && testimonial.client_company && (
                <p className="text-sm text-gray-600">{testimonial.client_company}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
