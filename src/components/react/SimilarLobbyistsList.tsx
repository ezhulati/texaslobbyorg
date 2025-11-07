import SimilarLobbyistCard from './SimilarLobbyistCard';

interface Lobbyist {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  bio?: string | null;
  profile_image_url?: string | null;
  cities: string[];
  subject_areas: string[];
  subscription_tier: 'free' | 'premium' | 'featured';
  view_count: number;
  title?: string | null;
}

interface SimilarLobbyistsListProps {
  lobbyists: Lobbyist[];
  maxDisplay?: number;
}

export default function SimilarLobbyistsList({
  lobbyists,
  maxDisplay = 6
}: SimilarLobbyistsListProps) {
  const displayedLobbyists = lobbyists.slice(0, maxDisplay);

  if (displayedLobbyists.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {displayedLobbyists.map((lobbyist) => (
        <SimilarLobbyistCard
          key={lobbyist.id}
          firstName={lobbyist.first_name}
          lastName={lobbyist.last_name}
          slug={lobbyist.slug}
          bio={lobbyist.bio}
          profileImageUrl={lobbyist.profile_image_url}
          cities={lobbyist.cities}
          subjectAreas={lobbyist.subject_areas}
          subscriptionTier={lobbyist.subscription_tier}
          viewCount={lobbyist.view_count}
          title={lobbyist.title}
        />
      ))}
    </div>
  );
}
