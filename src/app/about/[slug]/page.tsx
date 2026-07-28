import { newsList } from "@/lib/data";
import NewsCard from "@/components/about/news-card";
import Image from "next/image";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type NewsDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewsDetail({ params }: NewsDetailProps) {
  const { slug } = await params;
  const newsItem = newsList.find((n) => n.id === slug);

  if (!newsItem) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-xl font-semibold">Article not found</h2>
      </div>
    );
  }

  const otherNews = newsList.filter((n) => n.id !== newsItem.id);

  // Parse content into paragraphs and sections
  const contentParagraphs = newsItem.content.split("\n\n");

  return (
    <main className="bg-white mt-20">
      <div className="max-w-7xl mx-auto px-6 py-8 lg:py-12">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/about">News</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{newsItem.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title */}
        <h1 className="text-2xl lg:text-4xl font-semibold mb-6 leading-tight text-gray-900">
          {newsItem.title}
        </h1>

        {/* Author & Meta */}
        <div className="flex items-center gap-3 mb-10">
          <Image
            src={newsItem.author.avatar}
            alt={newsItem.author.name}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="flex items-center gap-2 text-sm text-gray-900">
            <span>{newsItem.author.name}</span>
            <span>•</span>
            <span>{newsItem.date}</span>
            <span>•</span>
            <span>{newsItem.readTime}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 lg:py-12">
        {/* Featured Image */}
        <Image
          src={newsItem.image}
          width={1200}
          height={600}
          alt={newsItem.title}
          className="rounded-2xl mb-10 w-full h-[400px] object-cover"
          priority
        />

        {/* Content */}
        <article className="prose prose-base max-w-none">
          {contentParagraphs.map((paragraph, index) => {
            // Check if it's a numbered list item
            if (/^\d+\./.test(paragraph.trim())) {
              const lines = paragraph.split("\n");
              const title = lines[0];
              const content = lines.slice(1).join(" ").trim();

              return (
                <div key={index} className="mb-8">
                  <h2 className="text-xl font-semibold mb-3 text-gray-900">
                    {title}
                  </h2>
                  {content && (
                    <p className="text-gray-700 leading-relaxed text-base">
                      {content}
                    </p>
                  )}
                </div>
              );
            }

            // Check if it's a bullet list
            if (paragraph.trim().startsWith("-")) {
              const items = paragraph.split("\n").filter((line) => line.trim());
              return (
                <ul key={index} className="list-disc pl-5 mb-6 space-y-1">
                  {items.map((item, i) => (
                    <li
                      key={i}
                      className="text-gray-700 leading-relaxed text-base"
                    >
                      {item.replace(/^-\s*/, "")}
                    </li>
                  ))}
                </ul>
              );
            }

            // Check for inline images
            if (paragraph.trim().startsWith("![")) {
              // Extract URL from ![url] format
              const match = paragraph.match(/!\[(.*?)\]/);
              if (match && match[1]) {
                const url = match[1];
                return (
                  <Image
                    key={index}
                    src={url}
                    width={1200}
                    height={600}
                    alt="Article image"
                    className="rounded-2xl my-10 w-full h-[350px] lg:h-[400px] object-cover"
                  />
                );
              }
            }

            // Regular paragraph
            if (paragraph.trim()) {
              return (
                <p
                  key={index}
                  className="text-gray-700 leading-relaxed text-base mb-6"
                >
                  {paragraph}
                </p>
              );
            }

            return null;
          })}
        </article>
      </div>

      {/* Other news */}
      <div className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center text-3xl lg:text-4xl font-semibold mb-12 lg:mb-16">
            Other news you might be interested
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {otherNews.slice(0, 2).map((item) => (
              <NewsCard
                key={item.id}
                image={item.image}
                category={item.category}
                categoryColor={item.categoryColor}
                date={item.date}
                title={item.title}
                description={item.excerpt}
                link={`/about/${item.id}`}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
