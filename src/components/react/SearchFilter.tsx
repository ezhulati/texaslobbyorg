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
  cities: initialCities,
  subjectAreas: initialSubjectAreas,
  clients: initialClients = [],
  initialQuery = '',
  initialCity = '',
  initialSubject = '',
  initialClients: initialClientSelections = [],
}: SearchFilterProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedClients, setSelectedClients] = useState<string[]>(initialClientSelections);

  // Dynamic filter options
  const [cities, setCities] = useState<City[]>(initialCities);
  const [subjectAreas, setSubjectAreas] = useState<SubjectArea[]>(initialSubjectAreas);
  const [clients, setClients] = useState<MultiSelectOption[]>(initialClients);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Fetch filtered options when filters change
  useEffect(() => {
    const fetchFilteredOptions = async () => {
      setIsLoadingFilters(true);

      try {
        // Build query parameters for each filter API
        const cityParams = new URLSearchParams();
        const subjectParams = new URLSearchParams();
        const clientParams = new URLSearchParams();

        if (selectedSubject) {
          cityParams.set('subject', selectedSubject);
          clientParams.set('subject', selectedSubject);
        }

        if (selectedCity) {
          subjectParams.set('city', selectedCity);
          clientParams.set('city', selectedCity);
        }

        // Fetch all three filter options in parallel
        const [citiesRes, subjectsRes, clientsRes] = await Promise.all([
          fetch(`/api/filters/cities?${cityParams.toString()}`),
          fetch(`/api/filters/subjects?${subjectParams.toString()}`),
          fetch(`/api/filters/clients?${clientParams.toString()}`)
        ]);

        const [newCities, newSubjects, newClients] = await Promise.all([
          citiesRes.json(),
          subjectsRes.json(),
          clientsRes.json()
        ]);

        setCities(newCities);
        setSubjectAreas(newSubjects);
        setClients(newClients);

        // If current selections are no longer available, clear them
        if (selectedCity && !newCities.find((c: City) => c.slug === selectedCity)) {
          setSelectedCity('');
        }
        if (selectedSubject && !newSubjects.find((s: SubjectArea) => s.slug === selectedSubject)) {
          setSelectedSubject('');
        }
        // Clear any client selections that are no longer available
        const availableClientValues = new Set(newClients.map((c: MultiSelectOption) => c.value));
        const validSelections = selectedClients.filter(c => availableClientValues.has(c));
        if (validSelections.length !== selectedClients.length) {
          setSelectedClients(validSelections);
        }
      } catch (error) {
        console.error('Error fetching filtered options:', error);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    // Only fetch if we have at least one filter selected
    if (selectedCity || selectedSubject) {
      fetchFilteredOptions();
    } else {
      // Reset to initial values when no filters
      setCities(initialCities);
      setSubjectAreas(initialSubjectAreas);
      setClients(initialClients);
    }
  }, [selectedCity, selectedSubject]);

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
        <div className="flex-1 min-w-0 relative">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            disabled={isLoadingFilters}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
          {isLoadingFilters && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-texas-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Subject Filter */}
        <div className="flex-1 min-w-0 relative">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={isLoadingFilters}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait"
          >
            <option value="">All Specialties</option>
            {subjectAreas.map((subject) => (
              <option key={subject.id} value={subject.slug}>
                {subject.name}
              </option>
            ))}
          </select>
          {isLoadingFilters && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-texas-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
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
              disabled={isLoadingFilters}
            />
          </div>
        )}
      </div>
    </form>
  );
}
