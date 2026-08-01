"use client";

// import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
// import TestimonialCarousel from "@/components/about/testimonial-carousel";
import { WhatsappLogo, InstagramLogo, EnvelopeSimple } from "@phosphor-icons/react";
// import NewsCard from "@/components/about/news-card";
// import { Skeleton } from "@/components/ui/skeleton";
// import { toast } from "sonner";
// import { Newspaper } from "lucide-react";

// --- Types ---

// interface ApiNewsItem {
//   id: number;
//   title: string;
//   slug: string;
//   excerpt: string | null;
//   // API might return a single string path or an array of media objects
//   image?: string | { media: string }[] | string[] | null;
//   category: string;
//   created_at: string;
// }

// interface ApiNewsResponse {
//   data: ApiNewsItem[];
// }

// --- Utilities ---

/**
 * Robustly resolves an image URL from various API formats
 */
// const resolveImageUrl = (imageField: ApiNewsItem["image"]): string => {
//   let path = "/images/no-image.jpg"; // Default fallback

//   if (!imageField) return path;

//   // Case 1: Array of objects (e.g. [{ media: '...' }])
//   if (Array.isArray(imageField) && imageField.length > 0) {
//     const firstItem = imageField[0];
//     if (typeof firstItem === "string") {
//       path = firstItem;
//     } else if (typeof firstItem === "object" && "media" in firstItem) {
//       path = firstItem.media;
//     }
//   }
//   // Case 2: Single String
//   else if (typeof imageField === "string") {
//     path = imageField;
//   }

//   // Handle Full URL vs Relative Path
//   if (path.startsWith("http")) return path;

//   const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
//   return `${API_URL}/${path.replace(/^\//, "")}`;
// };

/**
 * Maps category names to visual styles
 */
// const getCategoryColor = (category: string) => {
//   const map: Record<string, string> = {
//     Culture: "bg-orange-100 text-orange-700",
//     Business: "bg-blue-100 text-blue-700",
//     Events: "bg-purple-100 text-purple-700",
//     Technology: "bg-indigo-100 text-indigo-700",
//     Tourism: "bg-green-100 text-green-700",
//   };
//   return map[category] || "bg-gray-100 text-gray-700";
// };

/**
 * Formats ISO dates to readable strings
 */
// const formatDate = (dateString: string) => {
//   return new Date(dateString).toLocaleDateString("en-US", {
//     month: "long",
//     day: "numeric",
//     year: "numeric",
//   });
// };

export default function About() {
  // const [news, setNews] = useState<ApiNewsItem[]>([]);
  // const [isLoading, setIsLoading] = useState(true);

  // useEffect(() => {
  //   const fetchNews = async () => {
  //     setIsLoading(true);
  //     try {
  //       const API_URL =
  //         process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

  //       // Fetch latest news, limit to 2 for this specific layout
  //       const response = await fetch(`${API_URL}/api/news?per_page=2`, {
  //         headers: { Accept: "application/json" },
  //       });

  //       if (!response.ok) throw new Error("Failed to fetch news");

  //       const json: ApiNewsResponse = await response.json();
  //       // Handle Laravel pagination wrapper or direct array
  //       const data = Array.isArray(json) ? json : json.data || [];

  //       setNews(data);
  //     } catch (error) {
  //       console.error("Error fetching news:", error);
  //       toast.error("Could not load latest news.");
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   fetchNews();
  // }, []);

  return (
    <main className="bg-white text-[#1A1A1A]">
      {/* Hero Section */}
      <section className="relative w-full h-[420px] overflow-hidden">
        <Image
          src="/images/about/about-hero.jpg"
          alt="Hands Together"
          fill
          className="absolute inset-0 w-full h-full object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center justify-center lg:flex-row lg:justify-between lg:items-start h-full text-white text-center lg:text-left mt-5 lg:mt-48">
          <h2 className="text-4xl lg:text-5xl font-semibold mb-6">
            Who We Are
          </h2>

          <p className="max-w-lg leading-7 text-sm">
            Mefie Directory is a platform designed to make it easier to discover
            and connect with Ghanaian businesses, events, and experiences — both
            in Ghana and across the diaspora. It brings together trusted
            listings in one place, helping users find what they need quickly,
            while giving businesses greater visibility within a global audience.
            Whether you&apos;re looking to explore, support, or connect, the
            directory is built to make discovering Ghana simple and accessible.
          </p>
        </div>
      </section>

      {/* What You Can Do Here Section */}
      <section className="bg-[#F2F5F8] py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="md:mx-auto lg:mx-0">
            <h3 className="text-3xl lg:text-5xl font-semibold mb-10">
              What You Can Do Here
            </h3>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-xl font-bold">Discover</h4>
                <p className="text-sm mt-1 text-gray-600">
                  Find Ghanaian businesses, events, and services in one place.
                </p>
              </div>

              <div>
                <h4 className="text-xl font-bold">Connect</h4>
                <p className="text-sm mt-1 text-gray-600">
                  Engage directly with businesses and communities across the
                  diaspora.
                </p>
              </div>

              <div>
                <h4 className="text-xl font-bold">Explore</h4>
                <p className="text-sm mt-1 text-gray-600">
                  Experience Ghana through culture, food, events, and more.
                </p>
              </div>

              <div>
                <h4 className="text-xl font-bold">Support</h4>
                <p className="text-sm mt-1 text-gray-600">
                  Champion Ghanaian-owned businesses locally and globally.
                </p>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="w-full">
            <Image
              src="/images/about/about-2.jpg"
              alt="Community"
              width={700}
              height={700}
              className="rounded-lg w-full h-[640px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/* <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-3xl lg:text-5xl font-semibold mb-3">
            Loved by our customers
          </h3>
          <p className="text-base lg:text-lg text-gray-500 mb-12">
            Hundreds of 5-star reviews of Mefie Directory award winning software
          </p>

          <TestimonialCarousel />
        </div>
      </section> */}

      {/* Tell a Friend */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-3xl lg:text-5xl font-semibold mb-4">
            Tell a Friend About Mefie
          </h3>
          <p className="text-base lg:text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Know someone who could benefit from Mefie Directory? Share it with
            them and help grow the community.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="https://wa.me/?text=Check%20out%20Mefie%20Directory%20%E2%80%93%20a%20platform%20to%20discover%20Ghanaian%20businesses%2C%20events%2C%20and%20more!%20https%3A%2F%2Fme-fie.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-white font-medium hover:bg-[#1ebe57] transition-colors"
            >
              <WhatsappLogo size={20} weight="fill" />
              Share on WhatsApp
            </Link>
            <Link
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#E4405F] px-6 py-3 text-white font-medium hover:bg-[#d02d4d] transition-colors"
            >
              <InstagramLogo size={20} weight="fill" />
              Share on Instagram
            </Link>
            <Link
              href="mailto:?subject=Check%20out%20Mefie%20Directory&body=Hey%2C%20I%20thought%20you%E2%80%99d%20like%20Mefie%20Directory%20%E2%80%93%20a%20platform%20to%20discover%20Ghanaian%20businesses%2C%20events%2C%20and%20more!%20https%3A%2F%2Fme-fie.com"
              className="inline-flex items-center gap-2 rounded-full bg-[#93C01F] px-6 py-3 text-white font-medium hover:bg-[#7da61a] transition-colors"
            >
              <EnvelopeSimple size={20} weight="fill" />
              Share via Email
            </Link>
          </div>
        </div>
      </section>

      {/* Why Mefie Directory */}
      <section className="py-20 bg-[#F2F5F8]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-semibold mb-12">Why Mefie Directory</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Icons */}
            <div className="grid grid-cols-2 gap-12 text-left">
              <div>
                <span className="text-green-600 text-2xl">
                  <Image
                    src="/images/icons/check.svg"
                    alt="Focused"
                    width={40}
                    height={40}
                  />
                </span>
                <h4 className="font-semibold mt-2">Focused</h4>
                <p className="text-base mt-2 text-gray-600">
                  Built specifically for Ghanaian businesses and communities.
                </p>
              </div>

              <div>
                <span className="text-green-600 text-2xl">
                  <Image
                    src="/images/icons/people-1.svg"
                    alt="Accessible"
                    width={40}
                    height={40}
                  />
                </span>
                <h4 className="font-semibold mt-2">Accessible</h4>
                <p className="text-base mt-2 text-gray-600">
                  Designed to make discovery simple and seamless.
                </p>
              </div>

              <div>
                <span className="text-green-600 text-2xl">
                  <Image
                    src="/images/icons/chart.svg"
                    alt="Growing"
                    width={40}
                    height={40}
                  />
                </span>
                <h4 className="font-semibold mt-2">Growing</h4>
                <p className="text-base mt-2 text-gray-600">
                  Expanding to serve more businesses and communities every day.
                </p>
              </div>

              <div>
                <span className="text-green-600 text-2xl">
                  <Image
                    src="/images/icons/plane.svg"
                    alt="Trusted"
                    width={40}
                    height={40}
                  />
                </span>
                <h4 className="font-semibold mt-2">Trusted</h4>
                <p className="text-base mt-2 text-gray-600">
                  A space where quality and authenticity matter.
                </p>
              </div>
            </div>

            {/* Right stacked images */}
            <div className="grid grid-cols-2 gap-4">
              <Image
                src="/images/about/grid-1.jpg"
                alt="values-1"
                width={700}
                height={700}
                className="rounded-lg h-[640px] w-full object-cover col-span-1"
              />
              <div className="grid grid-cols-1 gap-4">
                <Image
                  src="/images/about/grid-2.jpg"
                  alt="values-2"
                  width={500}
                  height={500}
                  className="rounded-lg h-[312px] w-full object-cover"
                />
                <Image
                  src="/images/about/grid-3.jpg"
                  alt="values-3"
                  width={500}
                  height={500}
                  className="rounded-lg h-[312px] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News Section - API INTEGRATED */}
      {/* <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-semibold mb-2">
            News from Mefie Directory
          </h3>
          <p className="text-base text-gray-500 mb-12">
            Stay updated with stories, tips, and insights from our team.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
            {isLoading ? (
              // Loading State Skeletons
              <>
                <NewsCardSkeleton />
                <NewsCardSkeleton />
              </>
            ) : news.length > 0 ? (
              // Active Data
              news
                .slice(0, 2)
                .map((item) => (
                  <NewsCard
                    key={item.id}
                    image={resolveImageUrl(item.image)}
                    category={item.category || "General"}
                    categoryColor={getCategoryColor(item.category)}
                    date={formatDate(item.created_at)}
                    title={item.title}
                    description={item.excerpt || "Click to read more..."}
                    link={`/news/${item.slug}`}
                  />
                ))
            ) : (
              // Empty State
              <div className="col-span-1 md:col-span-2 py-12 flex items-center flex-col text-center border border-dashed rounded-xl  text-gray-500">
                <span>
                  <Newspaper />
                </span>
                No news articles available at the moment.
              </div>
            )}
          </div>
        </div>
      </section> */}
    </main>
  );
}

// --- Skeleton Component for the News Card ---
// function NewsCardSkeleton() {
//   return (
//     <div className="flex flex-col h-full">
//       {/* Image Placeholder */}
//       <Skeleton className="rounded-2xl h-[280px] lg:h-80 w-full mb-4" />

//       {/* Category & Date Row */}
//       <div className="flex items-center justify-between mb-3">
//         <Skeleton className="h-6 w-20 rounded-full" />
//         <Skeleton className="h-4 w-24" />
//       </div>

//       {/* Title */}
//       <Skeleton className="h-8 w-3/4 mb-3" />

//       {/* Description Lines */}
//       <div className="space-y-2 mb-4">
//         <Skeleton className="h-4 w-full" />
//         <Skeleton className="h-4 w-5/6" />
//         <Skeleton className="h-4 w-4/6" />
//       </div>

//       {/* Read More Button */}
//       <Skeleton className="h-5 w-24 mt-auto" />
//     </div>
//   );
// }
