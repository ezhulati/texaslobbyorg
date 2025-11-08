interface ProfileCompletionCardProps {
  lobbyistProfile: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    linkedin_url: string | null;
    bio: string | null;
    profile_image_url: string | null;
    years_experience: number | null;
    cities: string[] | null;
    subject_areas: string[] | null;
  };
}

export default function ProfileCompletionCard({ lobbyistProfile }: ProfileCompletionCardProps) {
  // Calculate completion percentage
  const required = [
    { field: 'first_name', label: 'First Name' },
    { field: 'last_name', label: 'Last Name'},
    { field: 'email', label: 'Email' },
    { field: 'bio', label: 'Bio' },
    { field: 'cities', label: 'Cities' },
    { field: 'subject_areas', label: 'Expertise Areas' },
  ];

  const recommended = [
    { field: 'phone', label: 'Phone Number' },
    { field: 'website', label: 'Website' },
    { field: 'linkedin_url', label: 'LinkedIn URL' },
    { field: 'profile_image_url', label: 'Profile Photo' },
    { field: 'years_experience', label: 'Years of Experience' },
  ];

  const requiredFilled = required.filter(({ field }) => {
    const value = lobbyistProfile[field as keyof typeof lobbyistProfile];
    if (Array.isArray(value)) return value && value.length > 0;
    return value !== null && value !== '';
  });

  const recommendedFilled = recommended.filter(({ field }) => {
    const value = lobbyistProfile[field as keyof typeof lobbyistProfile];
    if (Array.isArray(value)) return value && value.length > 0;
    return value !== null && value !== '';
  });

  // Required worth 70%, recommended worth 30%
  const completionPercentage = Math.round(
    (requiredFilled.length / required.length * 70) +
    (recommendedFilled.length / recommended.length * 30)
  );

  const missingRequired = required.filter(({ field }) => {
    const value = lobbyistProfile[field as keyof typeof lobbyistProfile];
    if (Array.isArray(value)) return !value || value.length === 0;
    return value === null || value === '';
  });

  const missingRecommended = recommended.filter(({ field }) => {
    const value = lobbyistProfile[field as keyof typeof lobbyistProfile];
    if (Array.isArray(value)) return !value || value.length === 0;
    return value === null || value === '';
  });

  const isComplete = completionPercentage === 100;

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Profile Completion</h3>
        <div className={`text-2xl font-bold ${
          completionPercentage === 100 ? 'text-green-600' :
          completionPercentage >= 70 ? 'text-texas-blue-500' :
          'text-amber-600'
        }`}>
          {completionPercentage}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              completionPercentage === 100 ? 'bg-green-600' :
              completionPercentage >= 70 ? 'bg-texas-blue-500' :
              'bg-amber-500'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {isComplete ? (
        <div className="flex items-center gap-2 text-green-600">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Profile complete!</span>
        </div>
      ) : (
        <div className="space-y-3">
          {missingRequired.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-600 mb-2">Required fields missing:</p>
              <ul className="space-y-1">
                {missingRequired.map(({ label }) => (
                  <li key={label} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="text-red-500">•</span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingRecommended.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-600 mb-2">Recommended to add:</p>
              <ul className="space-y-1">
                {missingRecommended.map(({ label }) => (
                  <li key={label} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="text-amber-500">•</span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
