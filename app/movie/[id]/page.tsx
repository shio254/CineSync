import { Badge } from "lucide-react";
import Image from "next/image";

// 1. Fetch Logic (Server Side)
// This function runs on the server to get data from TMDB before the page loads.
async function getMovie(id: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.e106f1ebf764099faf166a525b9e7ef6}&append_to_response=credits,similar`
  );
  if (!res.ok) {
    return null; // Handle error gracefully
  }
  return res.json();
}

// 2. The Page Component
export default async function MoviePage({ params }: { params: { id: string } }) {
  // We await params to get the ID from the URL (e.g., /movie/550 -> id = 550)
  const { id } = await params;
  const movie = await getMovie(id);

  if (!movie) {
    return <div className="text-white text-center mt-20">Movie not found</div>;
  }

  // MOCK DATA: This simulates your "Vibe Engine" results. 
  // Later, you will replace this with real data from your database.
  const vibeAnalysis = {
    primaryVibe: "Mind Bender",
    secondaryVibe: "Visual Spectacle",
    matchScore: 94, 
    friendStamps: [
      { user: "Rahul", stamp: "Theater Worthy" },
      { user: "Priya", stamp: "Slow Burn" },
    ]
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      
      {/* SECTION A: The Hero Backdrop */}
      <div className="relative h-[70vh] w-full">
        {movie.backdrop_path && (
            <Image
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
            alt={movie.title}
            fill
            className="object-cover opacity-40"
            priority
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-8 w-full max-w-4xl">
          {/* THE VIBE BADGE (Your unique feature) */}
          <div className="flex gap-2 mb-4">
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/50 uppercase tracking-wide">
              {vibeAnalysis.primaryVibe}
            </span>
            <span className="bg-neutral-800 text-neutral-400 px-3 py-1 rounded-full text-sm border border-neutral-700">
              {vibeAnalysis.secondaryVibe}
            </span>
          </div>

          <h1 className="text-5xl font-extrabold mb-4">{movie.title}</h1>
          
          <div className="flex items-center gap-6 text-sm text-neutral-300 mb-8">
            <span>{new Date(movie.release_date).getFullYear()}</span>
            <span>{movie.runtime} mins</span>
            <span className="flex items-center gap-1 text-yellow-500">
               ★ {movie.vote_average.toFixed(1)} (Global)
            </span>
          </div>

          {/* THE ACTION BAR */}
          <div className="flex gap-4">
            <button className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-neutral-200 transition">
              Play Trailer
            </button>
            <button className="bg-neutral-800 border border-neutral-700 text-white px-8 py-3 rounded-full font-bold hover:bg-neutral-700 transition">
              Add to Watchlist
            </button>
          </div>
        </div>
      </div>

      {/* SECTION B: The Inner Circle (Your Social Feature) */}
      <div className="max-w-6xl mx-auto px-8 mt-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4 text-emerald-400">Overview</h2>
            <p className="text-lg leading-relaxed text-neutral-300">{movie.overview}</p>
          </section>

          {/* CAST GRID */}
          <section>
            <h2 className="text-xl font-bold mb-4">Top Cast</h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {movie.credits.cast.slice(0, 6).map((actor: any) => (
                <div key={actor.id} className="min-w-[100px] text-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-2 mx-auto border-2 border-neutral-800 relative">
                    {actor.profile_path ? (
                        <Image 
                            src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} 
                            fill
                            alt={actor.name} 
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-neutral-800" />
                    )}
                  </div>
                  <p className="text-xs font-bold truncate">{actor.name}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{actor.character}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* SECTION C: The Sidebar (Friend Activity) */}
        <aside className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800 h-fit">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Badge className="text-emerald-500" size={20} />
            Inner Circle Activity
          </h3>
          
          <div className="space-y-6">
            {vibeAnalysis.friendStamps.map((friend, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm">
                    <span className="font-bold text-white">{friend.user}</span> stamped this:
                  </p>
                  <span className="inline-block mt-1 px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded border border-yellow-500/20">
                    {friend.stamp}
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-neutral-800">
              <p className="text-sm text-neutral-500 mb-3">Rate this movie:</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-2 text-xs bg-neutral-800 hover:bg-emerald-500/20 hover:text-emerald-400 rounded transition border border-neutral-700">
                  Theater Worthy
                </button>
                <button className="p-2 text-xs bg-neutral-800 hover:bg-blue-500/20 hover:text-blue-400 rounded transition border border-neutral-700">
                  Laptop Movie
                </button>
                <button className="p-2 text-xs bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 rounded transition border border-neutral-700">
                  Avoid
                </button>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}