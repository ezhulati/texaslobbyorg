import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MultiSelectDropdown, { type MultiSelectOption } from './MultiSelectDropdown';

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
  clients?: MultiSelectOption[];
  initialQuery?: string;
  initialCity?: string;
  initialSubject?: string;
  initialClients?: string[];
}

export default function SearchFilter({
  cities,
  subjectAreas,
  clients = [],
  initialQuery = '',
  initialCity = '',
  initialSubject = '',
  initialClients = [],
}: SearchFilterProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedClients, setSelectedClients] = useState<string[]>(initialClients);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedCity) params.set('city', selectedCity);
    if (selectedSubject) params.set('subject', selectedSubject);

    // Add multiple client parameters
    selectedClients.forEach(client => {
      params.append('client', client);
    });

    const searchUrl = `/lobbyists${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = searchUrl;
  };

  return (
    <form onSubmit={handleSearch} className="w-full space-y-4">
      {/* Primary Search Row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-14 text-base"
            />
          </div>
        </div>
        <Button
          type="submit"
          className="h-14 px-8 bg-texas-blue-500 hover:bg-texas-blue-600 text-white font-semibold text-base"
        >
          <Search className="h-5 w-5 mr-2" />
          Search
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* City Filter */}
        <div className="flex-1 min-w-0">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
        <div className="flex-1 min-w-0">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">All Specialties</option>
            {subjectAreas.map((subject) => (
              <option key={subject.id} value={subject.slug}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* Client Filter */}
        {clients.length > 0 && (
          <div className="flex-1 min-w-0">
            <MultiSelectDropdown
              options={clients.map(c => ({
                label: c.label,
                value: c.value,
                count: c.count
              }))}
              value={selectedClients}
              onChange={setSelectedClients}
              placeholder="Filter by client..."
              maxDisplayTags={1}
              className="h-11"
            />
          </div>
        )}
      </div>
    </form>
  );
}
