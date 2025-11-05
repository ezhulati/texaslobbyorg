import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  initialQuery?: string;
  initialCity?: string;
  initialSubject?: string;
}

export default function SearchFilter({
  cities,
  subjectAreas,
  initialQuery = '',
  initialCity = '',
  initialSubject = '',
}: SearchFilterProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedCity) params.set('city', selectedCity);
    if (selectedSubject) params.set('subject', selectedSubject);

    const searchUrl = `/lobbyists${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = searchUrl;
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-12"
            />
          </div>
        </div>

        {/* City Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">All Specialties</option>
            {subjectAreas.map((subject) => (
              <option key={subject.id} value={subject.slug}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <div className="w-full md:w-auto">
          <Button
            type="submit"
            className="w-full md:w-auto h-12 px-8 bg-texas-blue-500 hover:bg-texas-blue-600 text-white font-semibold"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
