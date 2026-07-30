"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const navigationItems = [
  {
    label: "Discover",
    href: "/discover",
    icon: "/images/icons/tag.svg",
    activeIcon: "/images/icons/tag-active.svg",
  },
  {
    label: "Businesses",
    href: "/businesses",
    icon: "/images/icons/Building.svg",
    activeIcon: "/images/icons/Building-active.svg",
  },
  {
    label: "Events",
    href: "/events",
    icon: "/images/icons/concert.svg",
    activeIcon: "/images/icons/concert-active.svg",
  },
  {
    label: "Communities",
    href: "/communities",
    icon: "/images/icons/people.svg",
    activeIcon: "/images/icons/people-active.svg",
  },
];

export default function NavigationTab() {
  const pathname = usePathname();

  return (
    <nav className="block lg:hidden w-full bg-white">
      <div className="mx-auto px-6 lg:px-16">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex flex-col md:flex-row items-center gap-2 py-5 px- 
                   transition-colors
                  ${
                    isActive
                      ? "text-[#9ACC23] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#9ACC23]"
                      : "text-gray-600 hover:text-gray-900"
                  }
                `}
              >
                {isActive ? (
                  <Image
                    src={item.activeIcon}
                    alt={item.label}
                    width={24}
                    height={24}
                  />
                ) : (
                  <Image
                    src={item.icon}
                    alt={item.label}
                    width={24}
                    height={24}
                  />
                )}
                <span className="text-sm md:text-base font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
