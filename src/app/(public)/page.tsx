import { Suspense } from "react";
import HomeContent from "@/components/landing-page/home-content";
// import { featuredBusinesses, Events } from "@/lib/data";

export default async function Home() {

  // const businesses = featuredBusinesses.slice(0, 8);
  // const upcomingEvents = Events.slice(0, 6);

  return (
    <Suspense fallback={null}>
      <HomeContent
        // featuredBusinesses={businesses}
        // upcomingEvents={upcomingEvents}
      />
    </Suspense>
  );
}