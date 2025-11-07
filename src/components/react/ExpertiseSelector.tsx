import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExpertiseSelectorProps {
  userId: string;
  currentCities?: string[] | null;
  currentSubjects?: string[] | null;
  onSave?: () => void;
}

export default function ExpertiseSelector({
  userId,
  currentCities,
  currentSubjects,
  onSave
}: ExpertiseSelectorProps) {
  const [cities, setCities] = useState<string[]>(currentCities || []);
  const [subjects, setSubjects] = useState<string[]>(currentSubjects || []);
  const [cityInput, setCityInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Common Texas cities
  const suggestedCities = [
    'Austin', 'Houston', 'Dallas', 'San Antonio', 'Fort Worth',
    'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Lubbock',
    'Irving', 'Garland', 'Frisco', 'McKinney', 'Amarillo'
  ];

  // Common subject areas
  const suggestedSubjects = [
    'Healthcare', 'Energy', 'Education', 'Transportation', 'Technology',
    'Agriculture', 'Finance', 'Real Estate', 'Environment', 'Insurance',
    'Telecommunications', 'Manufacturing', 'Retail', 'Tourism', 'Labor',
    'Tax Policy', 'Criminal Justice', 'Water Resources', 'Economic Development'
  ];

  const addCity = (city: string) => {
    const trimmed = city.trim();
    if (trimmed && !cities.includes(trimmed)) {
      setCities([...cities, trimmed]);
      setCityInput('');
    }
  };

  const removeCity = (city: string) => {
    setCities(cities.filter(c => c !== city));
  };

  const addSubject = (subject: string) => {
    const trimmed = subject.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setSubjectInput('');
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);

    if (cities.length === 0 || subjects.length === 0) {
      setError('Please add at least one city and one subject area');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('lobbyists')
        .update({
          cities,
          subject_areas: subjects,
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setSaved(true);
      onSave?.();

      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err?.message || 'Failed to save expertise');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cities Section */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Cities You Serve <span className="text-red-500">*</span>
        </label>

        {/* Selected Cities */}
        {cities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {cities.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1 rounded-full bg-texas-blue-500 px-3 py-1 text-sm text-white"
              >
                {city}
                <button
                  type="button"
                  onClick={() => removeCity(city)}
                  className="hover:text-red-200"
                  disabled={saving}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add City Input */}
        <div className="flex gap-2 mb-3">
          <Input
            type="text"
            placeholder="Enter city name"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCity(cityInput);
              }
            }}
            disabled={saving}
          />
          <Button
            type="button"
            onClick={() => addCity(cityInput)}
            disabled={!cityInput.trim() || saving}
          >
            Add
          </Button>
        </div>

        {/* Suggested Cities */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedCities
              .filter(city => !cities.includes(city))
              .map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => addCity(city)}
                  className="text-xs rounded-full border border-border px-3 py-1 hover:bg-accent transition-colors"
                  disabled={saving}
                >
                  + {city}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border"></div>

      {/* Subject Areas Section */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Areas of Expertise <span className="text-red-500">*</span>
        </label>

        {/* Selected Subjects */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {subjects.map((subject) => (
              <span
                key={subject}
                className="inline-flex items-center gap-1 rounded-full bg-texas-gold-500 px-3 py-1 text-sm text-white"
              >
                {subject}
                <button
                  type="button"
                  onClick={() => removeSubject(subject)}
                  className="hover:text-red-200"
                  disabled={saving}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add Subject Input */}
        <div className="flex gap-2 mb-3">
          <Input
            type="text"
            placeholder="Enter subject area"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubject(subjectInput);
              }
            }}
            disabled={saving}
          />
          <Button
            type="button"
            onClick={() => addSubject(subjectInput)}
            disabled={!subjectInput.trim() || saving}
          >
            Add
          </Button>
        </div>

        {/* Suggested Subjects */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedSubjects
              .filter(subject => !subjects.includes(subject))
              .map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => addSubject(subject)}
                  className="text-xs rounded-full border border-border px-3 py-1 hover:bg-accent transition-colors"
                  disabled={saving}
                >
                  + {subject}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving || cities.length === 0 || subjects.length === 0}
        className="w-full"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Expertise'}
      </Button>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800 flex items-center gap-2">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Expertise saved!
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h4 className="font-medium text-sm mb-2">Tips:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Select all cities where you actively lobby</li>
          <li>• Add your strongest areas of expertise first</li>
          <li>• Be specific to attract the right clients</li>
          <li>• You can always update these later</li>
        </ul>
      </div>
    </div>
  );
}
