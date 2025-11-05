import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface City {
  id: string;
  name: string;
  slug: string;
}

interface SubjectArea {
  id: string;
  name: string;
  slug: string;
}

interface SearchFilterProps {
  cities: City[];
  subjectAreas: SubjectArea[];
  initialCity?: string;
  initialSubject?: string;
}

export default function SearchFilter({
  cities,
  subjectAreas,
  initialCity = '',
  initialSubject = '',
}: SearchFilterProps) {
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (selectedCity) params.set('city', selectedCity);
    if (selectedSubject) params.set('subject', selectedSubject);

    const searchUrl = `/lobbyists${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = searchUrl;
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Subject Filter */}
        <div className="flex-1 min-w-0">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="flex h-14 w-full rounded-md border border-input bg-background px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select Expertise</option>
            {subjectAreas.map((subject) => (
              <option key={subject.id} value={subject.slug}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div className="flex-1 min-w-0">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="flex h-14 w-full rounded-md border border-input bg-background px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select City</option>
            {cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <Button
          type="submit"
          className="h-14 px-8 bg-texas-blue-500 hover:bg-texas-blue-600 text-white font-semibold text-base whitespace-nowrap"
        >
          <Search className="h-5 w-5 mr-2" />
          Find Lobbyists
        </Button>
      </div>
    </form>
  );
}
