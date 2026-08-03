// API utility functions for fetching data

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Listing {
  id: string;
  name: string;
  description: string;
  category: string;
  country: string;
  price?: number;
  image?: string[];
  createdAt: string;
  slug?: string;
}

export interface Business extends Listing {
  type: "business"; // This line is already present and correct
  address?: string;
  phone?: string;
  website?: string;
  rating: number;
  reviewCount: string;
  location: string;
  slug: string;
  category: string;
  verified?: boolean;
  discount?: string;
  reachBadge?: string | null;
}

export interface Event extends Listing {
  type: "event";
  date: string;
  location: string;
  ticketPrice?: number;
  slug: string;
  startDate: string;
  endDate: string;
  verified: boolean;
}

export interface Community extends Listing {
  type: "community";
  memberCount?: number;
  category: string;
  imageUrl: string;
  tag: string;
  verified: boolean;
}

export type EditableListingType = "business" | "event" | "community";

export interface EditableListingCategory {
  id: string | number;
  name?: string;
}

export interface EditableListingHour {
  day_of_week: string;
  open_time: string;
  close_time: string;
}

export interface EditableListingMedia {
  id?: number;
  original: string;
  thumb?: string;
  webp?: string;
  card?: string;
  kind: "image" | "video";
  role: "cover" | "gallery";
  position: number | null;
  mime_type?: string;
}

export interface EditableListingSocials {
  facebook?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  whatsapp?: string | null;
}

export interface EditableListingData {
  slug: string;
  name: string;
  type: EditableListingType;
  status: string;
  categories?: EditableListingCategory[];
  bio?: string | null;
  description?: string | null;
  primary_phone?: string | null;
  primary_country_code?: string | null;
  secondary_phone?: string | null;
  secondary_country_code?: string | null;
  email?: string | null;
  website?: string | null;
  business_reg_num?: string | null;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  google_plus_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: EditableListingHour[];
  socials?: EditableListingSocials | null;
  cover?: EditableListingMedia | null;
  gallery?: EditableListingMedia[];
  event?: Record<string, unknown> | null;
  event_price?: string | number | null;
  event_currency?: string | null;
  event_ticket_url?: string | null;
  event_online_url?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  event_location_type?: string | null;
  event_location?: string | null;
  event_venue?: string | null;
  event_venue_address?: string | null;
  event_country?: string | null;
  event_city?: string | null;
  event_timezone?: string | null;
  event_timezone_label?: string | null;
}

export interface ListingManagementCapabilities {
  can_edit: boolean;
  can_manage_services: boolean;
  can_reply_to_reviews: boolean;
}

export interface ListingManagementData extends EditableListingData {
  id: number;
  claim_status?: string | null;
  rating?: number;
  ratings_count?: number;
  views_count?: number;
  bookmarks_count?: number;
  services?: ListingService[];
  business_presence_type?: string | null;
  business_service_reach?: string | null;
  service_countries?: Array<{ code: string; name: string }>;
  community_location_scope?: string | null;
  community_participation_method?: string | null;
  capabilities: ListingManagementCapabilities;
}

export interface ListingService {
  id: number;
  slug: string;
  listing_id: number;
  name: string;
  description?: string | null;
  image?: string | null;
}

export interface ListingReview {
  id: number;
  slug: string;
  rating: number;
  comment?: string | null;
  status: string;
  vendor_reply?: string | null;
  vendor_reply_at?: string | null;
  created_at: string;
  user?: { first_name?: string | null; last_name?: string | null } | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_code?: string;
  image?: string | null;
  createdAt?: string;
}

export class ProfileSettingsApiError extends Error {
  constructor(
    message: string,
    readonly errors: Record<string, string[]> = {},
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProfileSettingsApiError";
  }
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

export interface OpeningHours {
  id: string;
  day: string;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price?: number;
}

export interface Social {
  id: string;
  platform: string;
  url: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface ApiResponse<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchParams {
  q?: string;
  country?: string;
  date?: string;
  price?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | null | undefined;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  name: string;
  confirmPassword?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build query string from search parameters
 */
function buildQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

/**
 * Get authorization header from token
 */
function getAuthHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// ============================================================================
// AUTHENTICATION APIs
// ============================================================================

/**
 * Login user
 */
export async function login(credentials: AuthCredentials): Promise<unknown> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to login' }));
    throw new Error(error.error || 'Failed to login');
  }

  return response.json();
}

/**
 * Register new user
 */
export async function register(data: RegisterData): Promise<unknown> {
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to register' }));
    throw new Error(error.error || 'Failed to register');
  }

  return response.json();
}

/**
 * Logout user
 */
export async function logout(token?: string): Promise<unknown> {
  const response = await fetch('/api/logout', {
    method: 'POST',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to logout' }));
    throw new Error(error.error || 'Failed to logout');
  }

  return response.json();
}

// ============================================================================
// USER APIs
// ============================================================================

/**
 * Get current user
 */
export async function getCurrentUser(token?: string): Promise<User> {
  const response = await fetch('/api/user', {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  return response.json();
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(token?: string, params: SearchParams = {}): Promise<ApiResponse<User>> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/all_users?${queryString}`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
}

/**
 * Update user
 */
export async function updateUser(data: Partial<User>, token?: string): Promise<User> {
  const response = await fetch('/api/update_user', {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update user' }));
    throw new Error(error.error || 'Failed to update user');
  }

  return response.json();
}

export async function updateUserProfile(
  data: FormData,
  token?: string,
): Promise<User> {
  const response = await fetch("/api/update_user", {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
    data?: User;
  };
  if (!response.ok) {
    throw new ProfileSettingsApiError(
      payload.message || "Failed to update profile",
      payload.errors,
      response.status,
    );
  }
  if (!payload.data) {
    throw new ProfileSettingsApiError("Profile response was incomplete");
  }
  return payload.data;
}

export async function changePassword(
  input: ChangePasswordInput,
  token?: string,
): Promise<void> {
  const response = await fetch("/api/change_password", {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      current_password: input.currentPassword,
      new_password: input.newPassword,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
  };
  if (!response.ok) {
    throw new ProfileSettingsApiError(
      payload.message || payload.error || "Failed to change password",
      payload.errors,
      response.status,
    );
  }
}

// ============================================================================
// LISTING APIs
// ============================================================================

/**
 * Fetch all listings
 */
export async function fetchListings(params: SearchParams = {}): Promise<ApiResponse<Listing>> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/listings?${queryString}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch listings');
  }

  return response.json();
}

/**
 * Get user's listings
 */
export async function getMyListings(token?: string, params: SearchParams = {}): Promise<ApiResponse<Listing>> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/listing/my_listings?${queryString}`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch my listings');
  }

  return response.json();
}

/**
 * Get single listing by slug
 */
export async function getListing(slug: string, token?: string): Promise<Listing> {
  const response = await fetch(`/api/listing/${slug}/show`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch listing');
  }

  return response.json();
}

/**
 * Load the canonical listing payload used by management forms.
 * The response type is authoritative; URL query parameters are hints only.
 */
export async function getEditableListing(
  slug: string,
  token?: string,
): Promise<EditableListingData> {
  const response = await fetch(`/api/listing/${encodeURIComponent(slug)}/show`, {
    headers: {
      ...getAuthHeaders(token),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    data?: EditableListingData;
    message?: string;
  } & Partial<EditableListingData>;
  if (!response.ok) {
    throw new ApiRequestError(
      payload.message || "Could not load listing details",
      response.status,
    );
  }

  const listing = payload.data ?? payload;
  if (
    !listing.slug ||
    !listing.name ||
    !["business", "event", "community"].includes(String(listing.type))
  ) {
    throw new ApiRequestError("Listing response was incomplete or invalid", 500);
  }

  return listing as EditableListingData;
}

export async function getListingManagement(
  slug: string,
  token?: string,
): Promise<ListingManagementData> {
  const response = await fetch(`/api/listing/${encodeURIComponent(slug)}/management`, {
    headers: { ...getAuthHeaders(token), Accept: "application/json" },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: ListingManagementData;
    message?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new ApiRequestError(payload.message || payload.error || "Could not load listing workspace", response.status);
  }
  const listing = payload.data;
  if (!listing || !listing.slug || !["business", "event", "community"].includes(listing.type) || !listing.capabilities) {
    throw new ApiRequestError("Listing management response was incomplete or invalid", 500);
  }
  return listing;
}

export async function getListingServices(slug: string, token?: string): Promise<ListingService[]> {
  const response = await fetch(`/api/listings/${encodeURIComponent(slug)}/services`, {
    headers: { ...getAuthHeaders(token), Accept: "application/json" },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: ListingService[]; message?: string; error?: string };
  if (!response.ok) throw new ApiRequestError(payload.message || payload.error || "Could not load services", response.status);
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function presignListingServiceImage(slug: string, file: File, token?: string): Promise<string> {
  const response = await fetch(`/api/listings/${encodeURIComponent(slug)}/services/presign`, {
    method: "POST",
    headers: { ...getAuthHeaders(token), Accept: "application/json" },
    body: JSON.stringify({ filename: file.name, mime_type: file.type, size: file.size }),
  });
  const payload = (await response.json().catch(() => ({}))) as { upload_url?: string; key?: string; message?: string; error?: string };
  if (!response.ok || !payload.upload_url || !payload.key) throw new ApiRequestError(payload.message || payload.error || "Could not prepare service image", response.status);
  const upload = await fetch(payload.upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!upload.ok) throw new ApiRequestError("Could not upload service image", upload.status);
  return payload.key;
}

export async function createListingService(slug: string, data: { name: string; description?: string; image_key?: string }, token?: string): Promise<ListingService> {
  const response = await fetch(`/api/listings/${encodeURIComponent(slug)}/services`, {
    method: "POST", headers: { ...getAuthHeaders(token), Accept: "application/json" }, body: JSON.stringify(data),
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: ListingService; message?: string; error?: string };
  if (!response.ok || !payload.data) throw new ApiRequestError(payload.message || payload.error || "Could not add service", response.status);
  return payload.data;
}

export async function updateListingService(serviceSlug: string, data: { name: string; description?: string; image_key?: string }, token?: string): Promise<ListingService> {
  const response = await fetch(`/api/services/${encodeURIComponent(serviceSlug)}`, {
    method: "PUT", headers: { ...getAuthHeaders(token), Accept: "application/json" }, body: JSON.stringify(data),
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: ListingService; message?: string; error?: string };
  if (!response.ok || !payload.data) throw new ApiRequestError(payload.message || payload.error || "Could not update service", response.status);
  return payload.data;
}

export async function deleteListingService(serviceSlug: string, token?: string): Promise<void> {
  const response = await fetch(`/api/services/${encodeURIComponent(serviceSlug)}`, { method: "DELETE", headers: { ...getAuthHeaders(token), Accept: "application/json" } });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new ApiRequestError(payload.message || payload.error || "Could not delete service", response.status);
  }
}

export async function getListingReviews(slug: string): Promise<ListingReview[]> {
  const response = await fetch(`/api/listing/${encodeURIComponent(slug)}/ratings`, { headers: { Accept: "application/json" }, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { data?: ListingReview[]; message?: string; error?: string };
  if (!response.ok) throw new ApiRequestError(payload.message || payload.error || "Could not load reviews", response.status);
  return Array.isArray(payload.data) ? payload.data : [];
}

/**
 * Create listing profile
 */
export async function createListingProfile(data: Partial<Listing>, token?: string): Promise<Listing> {
  const response = await fetch('/api/listing/profile', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create listing' }));
    throw new Error(error.error || 'Failed to create listing');
  }

  return response.json();
}

/**
 * Update listing
 */
export async function updateListing(slug: string, data: Partial<Listing>, token?: string): Promise<Listing> {
  const response = await fetch(`/api/listing/${slug}/update`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update listing' }));
    throw new Error(error.error || 'Failed to update listing');
  }

  return response.json();
}

/**
 * Update listing status
 */
export async function updateListingStatus(slug: string, status: string, token?: string): Promise<Listing> {
  const response = await fetch(`/api/listing/${slug}/update_status`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update listing status' }));
    throw new Error(error.error || 'Failed to update listing status');
  }

  return response.json();
}

/**
 * Update listing address
 */
export async function updateListingAddress(slug: string, address: Address, token?: string): Promise<Address> {
  const response = await fetch(`/api/listing/${slug}/address`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(address),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update address' }));
    throw new Error(error.error || 'Failed to update address');
  }

  return response.json();
}

/**
 * Delete listing
 */
export async function deleteListing(slug: string, token?: string): Promise<void> {
  const response = await fetch(`/api/listing/${slug}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete listing' }));
    throw new Error(error.error || 'Failed to delete listing');
  }
}

// ============================================================================
// BUSINESS APIs
// ============================================================================

/**
 * Fetch businesses
 */
export async function fetchBusinesses(params: SearchParams = {}): Promise<ApiResponse<Business>> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/businesses?${queryString}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch businesses');
  }

  return response.json();
}

// ============================================================================
// EVENT APIs
// ============================================================================

/**
 * Fetch events
 */
export async function fetchEvents(params: SearchParams = {}): Promise<ApiResponse<Event>> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/events?${queryString}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

  return response.json();
}

// ============================================================================
// COMMUNITY APIs
// ============================================================================

/**
 * Fetch communities
 */
export async function fetchCommunities(params: SearchParams = {}): Promise<ApiResponse<Community>> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/communities?${queryString}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch communities');
  }

  return response.json();
}

// ============================================================================
// CATEGORY APIs
// ============================================================================

/**
 * Get all categories
 */
export async function getCategories(token?: string, params: SearchParams = {}): Promise<ApiResponse<Category>> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/categories?${queryString}`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  return response.json();
}

/**
 * Create category
 */
export async function createCategory(data: Partial<Category>, token?: string): Promise<Category> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create category' }));
    throw new Error(error.error || 'Failed to create category');
  }

  return response.json();
}

/**
 * Update category
 */
export async function updateCategory(id: string, data: Partial<Category>, token?: string): Promise<Category> {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update category' }));
    throw new Error(error.error || 'Failed to update category');
  }

  return response.json();
}

/**
 * Delete category
 */
export async function deleteCategory(id: string, token?: string): Promise<void> {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete category' }));
    throw new Error(error.error || 'Failed to delete category');
  }
}

// ============================================================================
// OPENING HOURS APIs
// ============================================================================

/**
 * Get opening hours for a listing
 */
export async function getOpeningHours(listingId: string, token?: string): Promise<OpeningHours[]> {
  const response = await fetch(`/api/listing/${listingId}/opening_hours`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch opening hours');
  }

  return response.json();
}

/**
 * Create opening hours
 */
export async function createOpeningHours(listingId: string, data: Partial<OpeningHours>, token?: string): Promise<OpeningHours> {
  const response = await fetch(`/api/listing/${listingId}/opening_hours`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create opening hours' }));
    throw new Error(error.error || 'Failed to create opening hours');
  }

  return response.json();
}

/**
 * Update opening hours
 */
export async function updateOpeningHours(id: string, data: Partial<OpeningHours>, token?: string): Promise<OpeningHours> {
  const response = await fetch(`/api/opening_hours/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update opening hours' }));
    throw new Error(error.error || 'Failed to update opening hours');
  }

  return response.json();
}

/**
 * Delete opening hours
 */
export async function deleteOpeningHours(id: string, token?: string): Promise<void> {
  const response = await fetch(`/api/opening_hours/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete opening hours' }));
    throw new Error(error.error || 'Failed to delete opening hours');
  }
}

// ============================================================================
// SERVICE APIs
// ============================================================================

/**
 * Get services for a listing
 */
export async function getServices(listingId: string, token?: string): Promise<Service[]> {
  const response = await fetch(`/api/listing/${listingId}/services`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch services');
  }

  return response.json();
}

/**
 * Create service
 */
export async function createService(listingId: string, data: Partial<Service>, token?: string): Promise<Service> {
  const response = await fetch(`/api/listing/${listingId}/services`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create service' }));
    throw new Error(error.error || 'Failed to create service');
  }

  return response.json();
}

/**
 * Update service
 */
export async function updateService(id: string, data: Partial<Service>, token?: string): Promise<Service> {
  const response = await fetch(`/api/service/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update service' }));
    throw new Error(error.error || 'Failed to update service');
  }

  return response.json();
}

/**
 * Delete service
 */
export async function deleteService(id: string, token?: string): Promise<void> {
  const response = await fetch(`/api/service/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete service' }));
    throw new Error(error.error || 'Failed to delete service');
  }
}

// ============================================================================
// SOCIAL APIs
// ============================================================================

/**
 * Get social links for a listing
 */
export async function getSocials(listingId: string, token?: string): Promise<Social[]> {
  const response = await fetch(`/api/listing/${listingId}/socials`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch socials');
  }

  return response.json();
}

/**
 * Create social link
 */
export async function createSocial(listingId: string, data: Partial<Social>, token?: string): Promise<Social> {
  const response = await fetch(`/api/listing/${listingId}/socials`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create social' }));
    throw new Error(error.error || 'Failed to create social');
  }

  return response.json();
}

/**
 * Update social link
 */
export async function updateSocial(id: string, data: Partial<Social>, token?: string): Promise<Social> {
  const response = await fetch(`/api/listing/socials/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update social' }));
    throw new Error(error.error || 'Failed to update social');
  }

  return response.json();
}

/**
 * Delete social link
 */
export async function deleteSocial(id: string, token?: string): Promise<void> {
  const response = await fetch(`/api/listing/socials/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete social' }));
    throw new Error(error.error || 'Failed to delete social');
  }
}

// ============================================================================
// SEARCH API
// ============================================================================

/**
 * Global search across all content types
 */
export async function search<T = unknown>(params: SearchParams = {}, token?: string): Promise<T> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/search?${queryString}`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to search');
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// CLAIM FLOW API
// ============================================================================

export type ClaimCaseType = 'ordinary' | 'rectification';
export type ClaimMethod = 'email' | 'document' | 'email_plus_document';
export type ClaimStatus =
  | 'awaiting_email_verification'
  | 'under_review'
  | 'more_evidence_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'closed_other_claim_approved'
  | 'expired';

export interface ClaimEligibility {
  claimable: boolean;
  claim_type: ClaimCaseType | null;
  available_methods: ('email' | 'document')[];
  reason: string | null;
  masked_email: string | null;
  /** The caller's own in-progress case, so the UI can resume instead of dead-ending. */
  active_case: {
    id: number;
    status: ClaimStatus;
    method: ClaimMethod;
    case_type: ClaimCaseType;
  } | null;
  evidence_constraints: ClaimEvidenceConstraints;
  prior_claims: ClaimCaseSummary[];
}

export interface ClaimEvidenceConstraints {
  max_files_per_submission: number;
  max_file_size_bytes: number;
  accepted_extensions: string[];
  accepted_mime_types: string[];
}

export interface ClaimCaseEvent {
  id: number;
  event_type: string;
  metadata: {
    instructions?: string;
    reason?: string;
    recommendation?: string;
    evidence_ids?: number[];
    evidence_count?: number;
    method?: string;
    case_type?: string;
  };
  created_at: string;
}

export interface ClaimEvidenceItem {
  id: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  submission_round?: number;
  /** Admin view only: uploaded after the most recent evidence request. */
  is_new?: boolean;
}

export interface ClaimCaseSummary {
  id: number;
  listing: {
    id: number;
    name: string;
    slug: string;
    type: string;
    image?: string | null;
  };
  case_type: ClaimCaseType;
  method: ClaimMethod;
  status: ClaimStatus;
  email_verified_at: string | null;
  evidence_instructions: string | null;
  rejection_reason: string | null;
  rejection_recommendation: string | null;
  evidence: ClaimEvidenceItem[];
  events: ClaimCaseEvent[];
  evidence_constraints: ClaimEvidenceConstraints;
  available_actions: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  withdrawn_at: string | null;
}

export class ClaimEvidenceValidationError extends Error {
  constructor(readonly errors: Record<string, string[]>, message = 'Check the selected evidence files.') {
    super(message);
    this.name = 'ClaimEvidenceValidationError';
  }
}

async function claimUploadError(response: Response, fallback: string): Promise<Error> {
  const data = await response.json().catch(() => ({})) as {
    message?: string;
    errors?: Record<string, string[]>;
  };
  if (response.status === 422 && data.errors) {
    const firstFieldMessage = Object.values(data.errors).flat()[0];
    return new ClaimEvidenceValidationError(
      data.errors,
      firstFieldMessage || data.message || fallback,
    );
  }
  if (response.status === 413) {
    return new Error('The selected evidence is too large for one request. Upload no more than five files of 5 MB each.');
  }
  return new Error(data.message || fallback);
}

export interface ClaimCaseAdmin {
  id: number;
  listing: {
    id: number;
    name: string;
    slug: string;
    type: string;
    status: string;
    claim_status: string;
    has_open_agent_revision: boolean;
  };
  claimant: { id: number; name: string; email: string; role: string };
  current_owner: { id: number; name: string } | null;
  case_type: ClaimCaseType;
  method: ClaimMethod;
  status: ClaimStatus;
  email_verified_at: string | null;
  evidence_instructions: string | null;
  rejection_reason: string | null;
  rejection_recommendation: string | null;
  evidence: ClaimEvidenceItem[];
  competing_active_claims: { id: number; claimant_name: string; method: ClaimMethod; status: ClaimStatus }[];
  events: { id: number; actor_id: number | null; event_type: string; metadata: Record<string, unknown> | null; created_at: string }[];
  resolved_by: string | null;
  resolved_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Explicit claim eligibility — never infer claimability from raw listing fields.
 */
export async function getClaimEligibility(listingSlug: string, token?: string): Promise<ClaimEligibility> {
  const response = await fetch(`/api/listing/${listingSlug}/claim_eligibility`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to check claim eligibility');
  }

  return response.json();
}

export async function initiateEmailClaim(listingSlug: string, token?: string): Promise<{ message: string; claim_id: number; email_preview: string }> {
  const response = await fetch(`/api/listing/${listingSlug}/claims/email`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to start email verification');
  }

  return data;
}

export async function resendEmailClaimOtp(listingSlug: string, token?: string): Promise<{ message: string }> {
  const response = await fetch(`/api/listing/${listingSlug}/claims/email/resend`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to resend code');
  }

  return data;
}

export async function verifyEmailClaimOtp(listingSlug: string, otp: string, token?: string): Promise<{ message: string; claim_id: number; status: ClaimStatus }> {
  const response = await fetch(`/api/listing/${listingSlug}/claims/email/verify`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ otp }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Invalid or expired code');
  }

  return data;
}

export async function submitDocumentClaim(
  listingSlug: string,
  files: File[],
  token?: string,
  extras?: { role?: string; notes?: string },
): Promise<{ message: string; claim_id: number; status: ClaimStatus; case_type: ClaimCaseType }> {
  const formData = new FormData();
  files.forEach((file) => formData.append('documents[]', file));
  if (extras?.role) formData.append('role', extras.role);
  if (extras?.notes) formData.append('notes', extras.notes);

  const response = await fetch(`/api/listing/${listingSlug}/claims/document`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) throw await claimUploadError(response, 'Failed to submit claim');
  const data = await response.json().catch(() => ({}));

  return data;
}

export async function getMyClaims(token?: string, params: SearchParams = {}): Promise<ApiResponse<ClaimCaseSummary>> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/my_claims?${queryString}`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch your claims');
  }

  return response.json();
}

export async function getClaim(claimId: number | string, token?: string): Promise<ClaimCaseSummary> {
  const response = await fetch(`/api/claims/${claimId}`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch claim');
  }

  return response.json();
}

export async function addClaimEvidence(claimId: number | string, files: File[], token?: string): Promise<{ message: string; status: ClaimStatus }> {
  const formData = new FormData();
  files.forEach((file) => formData.append('documents[]', file));

  const response = await fetch(`/api/claims/${claimId}/evidence`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) throw await claimUploadError(response, 'Failed to submit evidence');
  const data = await response.json().catch(() => ({}));

  return data;
}

export async function withdrawClaim(claimId: number | string, token?: string): Promise<{ message: string; status: ClaimStatus }> {
  const response = await fetch(`/api/claims/${claimId}/withdraw`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to withdraw claim');
  }

  return data;
}

export async function adminListClaims(token?: string, params: SearchParams = {}): Promise<ApiResponse<ClaimCaseAdmin>> {
  const queryString = buildQueryString(params);
  const response = await fetch(`/api/admin/claims?${queryString}`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch claims');
  }

  return response.json();
}

export async function adminGetClaim(claimId: number | string, token?: string): Promise<ClaimCaseAdmin> {
  const response = await fetch(`/api/admin/claims/${claimId}`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch claim');
  }

  return response.json();
}

export async function adminApproveClaim(
  claimId: number | string,
  token?: string,
): Promise<{ message: string }> {
  const response = await fetch(`/api/admin/claims/${claimId}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      // Revision creation is paused. This keeps claim handoff safe during the
      // deployment window if a legacy open revision still exists.
      acknowledge_revision_cancellation: true,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to approve claim');
  }

  return data;
}

export async function adminRejectClaim(
  claimId: number | string,
  reason: string,
  recommendation: string | undefined,
  token?: string,
): Promise<{ message: string }> {
  const response = await fetch(`/api/admin/claims/${claimId}/reject`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ reason, recommendation }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to reject claim');
  }

  return data;
}

export async function adminRequestMoreEvidence(
  claimId: number | string,
  instructions: string,
  token?: string,
): Promise<{ message: string }> {
  const response = await fetch(`/api/admin/claims/${claimId}/request_evidence`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ instructions }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to request evidence');
  }

  return data;
}

export async function adminGetEvidenceSignedUrl(
  claimId: number | string,
  evidenceId: number | string,
  token?: string,
): Promise<{ url: string; expires_in_minutes: number }> {
  const response = await fetch(`/api/admin/claims/${claimId}/evidence/${evidenceId}/signed_url`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to get evidence link');
  }

  return response.json();
}

export async function getClaimEvidenceSignedUrl(
  claimId: number | string,
  evidenceId: number | string,
  token?: string,
): Promise<{ url: string; expires_in_minutes: number }> {
  const response = await fetch(`/api/claims/${claimId}/evidence/${evidenceId}/signed_url`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as { url?: string; expires_in_minutes?: number; message?: string };
  if (!response.ok || !data.url) {
    throw new Error(data.message || 'Failed to open evidence');
  }
  return { url: data.url, expires_in_minutes: data.expires_in_minutes ?? 5 };
}

// ============================================================================
// LISTING MEDIA REVISIONS (atomic image/video saves)
// ============================================================================

export type MediaRole = 'cover' | 'gallery';
export type MediaKind = 'image' | 'video';
export type MediaItemStatus =
  | 'pending_upload'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'cancelled';
export type MediaRevisionStatus =
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'committing'
  | 'committed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface MediaRevisionItem {
  id: number;
  role: MediaRole;
  kind: MediaKind;
  original_filename: string;
  mime_type: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  position: number | null;
  replaces_media_id: number | null;
  status: MediaItemStatus;
  failure_code: string | null;
  alt_text: string | null;
}

export interface MediaRevision {
  id: number;
  listing_id: number;
  status: MediaRevisionStatus;
  base_media_version: number;
  desired_state: MediaDesiredState | null;
  failure_code: string | null;
  expires_at: string | null;
  items: MediaRevisionItem[];
}

export interface MediaRef {
  type: 'item' | 'media';
  id: number;
}

export interface MediaDesiredState {
  cover: MediaRef;
  gallery?: MediaRef[];
  removals?: number[];
  alt_texts?: Record<string, string>;
}

export interface ActiveMediaItem {
  id: number;
  kind: MediaKind;
  role: MediaRole;
  position: number | null;
  original: string;
  thumb: string;
  webp: string;
  poster: string | null;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  alt_text: string;
  processing_status: 'ready';
}

export interface ListingActiveMedia {
  cover: ActiveMediaItem | null;
  cover_is_explicit: boolean;
  gallery: ActiveMediaItem[];
  media_version: number;
}

interface StageItemResponse {
  item_id: number;
  upload_mode: 'presigned' | 'direct';
  presigned_url: string | null;
  headers: Record<string, string> | null;
}

export class ApiRateLimitError extends Error {
  readonly status = 429;

  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = 'ApiRateLimitError';
  }
}

/** Non-429 media API failure carrying the HTTP status for retry decisions. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function mediaApiError(response: Response, fallback: string): Promise<Error> {
  const data = await response.json().catch(() => ({})) as {
    message?: string;
    retry_after?: number | string;
  };

  if (response.status === 429) {
    const headerRetryAfter = Number(response.headers.get('Retry-After'));
    const bodyRetryAfter = Number(data.retry_after);
    const retryAfter = Number.isFinite(headerRetryAfter) && headerRetryAfter > 0
      ? headerRetryAfter
      : Number.isFinite(bodyRetryAfter) && bodyRetryAfter > 0
        ? bodyRetryAfter
        : 60;

    return new ApiRateLimitError(data.message || fallback, retryAfter);
  }

  return new ApiRequestError(data.message || fallback, response.status);
}

function unwrap<T>(json: unknown): T {
  const obj = json as { data?: T };
  return (obj?.data ?? json) as T;
}

export async function createMediaRevision(listingSlug: string, token?: string): Promise<MediaRevision> {
  const response = await fetch(`/api/listing/${listingSlug}/media_revisions`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw await mediaApiError(response, 'Failed to start media edit');
  const data = await response.json().catch(() => ({}));
  return unwrap<MediaRevision>(data);
}

export async function getMediaRevision(revisionId: number, token?: string): Promise<MediaRevision> {
  const response = await fetch(`/api/media_revisions/${revisionId}`, {
    headers: getAuthHeaders(token),
    cache: 'no-store',
  });
  if (!response.ok) throw await mediaApiError(response, 'Failed to load media state');
  const data = await response.json().catch(() => ({}));
  return unwrap<MediaRevision>(data);
}

export async function stageRevisionItem(
  revisionId: number,
  meta: { role: MediaRole; kind: MediaKind; original_filename: string; mime_type: string; file_size: number; replaces_media_id?: number },
  token?: string,
): Promise<StageItemResponse> {
  const response = await fetch(`/api/media_revisions/${revisionId}/items`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(meta),
  });
  if (!response.ok) throw await mediaApiError(response, 'Failed to stage upload');
  const data = await response.json().catch(() => ({}));
  return data as StageItemResponse;
}

/**
 * Delivers a staged file. Presigned mode PUTs straight to S3 (bypasses the BFF
 * body limit) then confirms with the backend; direct mode posts multipart via
 * the BFF (local/dev). onProgress receives 0–100.
 */
export async function uploadRevisionItemFile(
  revisionId: number,
  stage: StageItemResponse,
  file: File,
  token?: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (stage.upload_mode === 'presigned' && stage.presigned_url) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const abortUpload = () => xhr.abort();
      signal?.addEventListener('abort', abortUpload, { once: true });
      xhr.open('PUT', stage.presigned_url as string);
      Object.entries(stage.headers ?? {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed')));
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'));
      xhr.onloadend = () => signal?.removeEventListener('abort', abortUpload);
      xhr.send(file);
    });

    const confirm = await fetch(`/api/media_revisions/${revisionId}/items/${stage.item_id}/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      signal,
    });
    if (!confirm.ok) {
      throw await mediaApiError(confirm, 'Failed to confirm upload');
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    const abortUpload = () => xhr.abort();
    signal?.addEventListener('abort', abortUpload, { once: true });
    // Use the already-established staged-items proxy for local multipart
    // delivery. The nested /upload proxy remains for older clients.
    xhr.open('POST', `/api/media_revisions/${revisionId}/items?item_id=${stage.item_id}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      try {
        const data = JSON.parse(xhr.responseText) as { message?: string; retry_after?: number };
        if (xhr.status === 429) {
          const retryAfter = Number(xhr.getResponseHeader('Retry-After') ?? data.retry_after ?? 60);
          reject(new ApiRateLimitError(data.message || 'Upload rate limited', retryAfter));
          return;
        }
        reject(new ApiRequestError(data.message || 'Upload failed', xhr.status));
      } catch {
        reject(new ApiRequestError('Upload failed', xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiRequestError('Upload failed', xhr.status || 0));
    xhr.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'));
    xhr.onloadend = () => signal?.removeEventListener('abort', abortUpload);
    xhr.send(formData);
  });
}

export async function updateRevisionDesiredState(
  revisionId: number,
  state: MediaDesiredState,
  token?: string,
): Promise<MediaRevision> {
  const response = await fetch(`/api/media_revisions/${revisionId}/desired_state`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(state),
  });
  if (!response.ok) throw await mediaApiError(response, 'Failed to save media layout');
  const data = await response.json().catch(() => ({}));
  return unwrap<MediaRevision>(data);
}

export async function commitMediaRevision(
  revisionId: number,
  token?: string,
): Promise<{ message: string; media: ListingActiveMedia }> {
  const response = await fetch(`/api/media_revisions/${revisionId}/commit`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) throw await mediaApiError(response, 'Failed to save media');
  const data = await response.json().catch(() => ({}));
  return data as { message: string; media: ListingActiveMedia };
}

export async function cancelMediaRevision(revisionId: number, token?: string): Promise<void> {
  const response = await fetch(`/api/media_revisions/${revisionId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw await mediaApiError(response, 'Failed to discard media changes');
  }
}

export interface ListingExperienceInput {
  business_presence_type?: "physical" | "online" | "hybrid" | null;
  business_service_reach?: "single_country" | "selected_countries" | "worldwide" | null;
  service_countries?: Array<{ code: string; name: string }>;
  business_hours_mode?: "scheduled" | "always_open" | "appointment_only" | "contact_for_hours" | null;
  community_location_scope?: "physical" | "online" | "hybrid" | "global" | null;
  community_participation_method?: string | null;
  has_base_location?: boolean;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: Array<{ day_of_week: string; open_time: string; close_time: string }>;
}

export class ListingExperienceValidationError extends Error {
  constructor(readonly errors: Record<string, string[]>, message = "Check the highlighted fields") {
    super(message);
    this.name = "ListingExperienceValidationError";
  }
}

export async function updateListingExperience(
  slug: string,
  input: ListingExperienceInput,
  token?: string,
): Promise<unknown> {
  const response = await fetch(`/api/listing/${slug}/experience`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string; errors?: Record<string, string[]> };
    if (response.status === 422 && payload.errors) {
      throw new ListingExperienceValidationError(payload.errors, payload.message);
    }
    throw new ApiRequestError(payload.message || "Failed to save listing step", response.status);
  }
  return response.json();
}

export async function submitListingForReview(slug: string, token?: string): Promise<unknown> {
  const response = await fetch(`/api/listing/${slug}/submit`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({}),
  });
  if (!response.ok) throw await mediaApiError(response, "Listing is not ready to submit");
  return response.json();
}

export async function updateListingFormProgress(
  slug: string,
  step: string,
  state: "complete" | "optional",
  token?: string,
): Promise<void> {
  const response = await fetch(`/api/listing/${slug}/form_progress`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ step, state }),
  });
  if (!response.ok) throw await mediaApiError(response, "Could not save form progress");
}

// ============================================================================
// LISTING AGENT LIFECYCLE V1
// ============================================================================

export type AgentListingState =
  | "draft"
  | "pending"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "suspended";

export type AgentClaimState =
  | "unclaimed"
  | "claim_in_progress"
  | "claimed";

export interface AgentWorkListing {
  id: number;
  slug: string;
  name: string;
  listing_type: "business" | "event" | "community";
  listing_state: AgentListingState;
  revision_state:
    | "draft"
    | "pending"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "cancelled_ownership_handoff"
    | "superseded"
    | null;
  claim_state: AgentClaimState;
  source_count: number;
  last_updated_at: string;
  available_next_action:
    | "read_only_history"
    | "edit_or_submit"
    | "await_moderation_or_edit"
    | "edit_and_resubmit"
    | "continue_revision"
    | "maintain_through_revision"
    | "read_only";
  ownership_handed_over_at?: string | null;
}

export interface AgentMetrics {
  created: number;
  submitted: number;
  approved: number;
  changes_requested: number;
  rejected: number;
  approval_rate: number | null;
  currently_unclaimed: number;
  claimed: number;
  median_moderation_turnaround_seconds: number | null;
  duplicate_warning_rate: number | null;
  historical_coverage_notice: string;
}

export interface AgentWorkResponse {
  data: AgentWorkListing[];
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

export interface AgentWorkQuery {
  state?: AgentListingState | AgentClaimState;
  q?: string;
  page?: number;
  perPage?: number;
}

export interface GrandfatheredOwnedListing {
  id: number;
  slug: string;
  name: string;
  type: "business" | "event" | "community";
  status: AgentListingState;
  country?: string | null;
  city?: string | null;
  images?: Array<{ original: string; thumb: string; webp: string }>;
}

export interface DuplicateCandidate {
  listing_id: number;
  title: string;
  listing_type: "business" | "event" | "community";
  locality: string;
  matched_signals: string[];
  confidence_band: "probable_duplicate" | "strong_identity_collision";
  public_url: string;
}

export interface DuplicateAssessment {
  assessment_id: number;
  warning_level:
    | "probable_duplicate"
    | "strong_identity_collision"
    | null;
  requires_explanation: boolean;
  requires_admin_resolution: boolean;
  candidates: DuplicateCandidate[];
  matched_signals: string[];
  created_at: string;
}

export interface DuplicatePreflightInput {
  type: "business" | "event" | "community";
  name: string;
  country?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  email?: string;
  primary_phone?: string;
  website?: string;
  business_reg_num?: string;
  registration_authority?: string;
  event_start_date?: string;
  event_venue?: string;
}

export interface ListingSource {
  id: number;
  url: string;
  domain: string;
  source_type:
    | "official_website"
    | "official_social"
    | "government_registry"
    | "reputable_directory"
    | "ticket_platform"
    | "news_source"
    | "other";
  is_primary: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ListingInternalNote {
  id: number;
  body: string | null;
  author_id: number;
  is_purged: boolean;
  purged_at: string | null;
  retention_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminStewardshipQueueItem {
  listing_id: number;
  slug: string;
  name: string;
  listing_state: AgentListingState;
  revision_state: AgentWorkListing["revision_state"];
  claim_state: AgentClaimState;
  stewardship_state:
    | "assigned_available"
    | "assigned_unavailable"
    | "unassigned"
    | "ended";
  created_by: { id: number; name: string; email: string } | null;
  current_steward: { id: number; name: string } | null;
  previous_steward: { id: number; end_reason: string } | null;
  last_update: string;
  unavailable_since: string | null;
}

export interface EligibleStewardshipAgent {
  id: number;
  name: string;
  email: string;
}

export interface AdminPendingRevision {
  id: number;
  listing: {
    id: number;
    slug: string;
    name: string;
    type: "business" | "event" | "community";
    status: string;
    content_version: number;
    ownership_state: "owned" | "unowned";
  };
  base_content_version: number;
  revision_version: number;
  status: "pending";
  proposed_changes: Record<string, unknown>;
  proposed_relationship_state: Record<string, unknown>;
  media_revision_id: number | null;
  created_by: { id: number; name: string };
  submitted_at: string | null;
  updated_at: string | null;
}

export interface ListingContentRevision {
  id: number;
  listing_id: number;
  base_content_version: number;
  revision_version: number;
  status:
    | "draft"
    | "pending"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "cancelled_ownership_handoff"
    | "superseded";
  proposed_changes: Record<string, unknown>;
  proposed_relationship_state: Record<string, unknown>;
  media_revision_id: number | null;
  moderation_reason: string | null;
  submitted_at: string | null;
  updated_at: string | null;
}

export interface AdminDuplicateAssessment {
  assessment_id: number;
  listing: {
    id: number;
    slug: string;
    name: string;
    type: "business" | "event" | "community";
    status: string;
  };
  warning_level: "strong_identity_collision";
  candidates: DuplicateCandidate[];
  matched_signals: string[];
  agent_explanation: string | null;
  created_at: string;
}

export interface OperationsPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedOperationsResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: OperationsPaginationMeta;
}

export interface OperationsQuery {
  q?: string;
  page?: number;
  perPage?: number;
}

function agentAuthHeaders(token?: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function lifecycleApiError(
  response: Response,
  fallback: string,
): Promise<ApiRequestError> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return new ApiRequestError(
    payload.error || payload.message || fallback,
    response.status,
  );
}

export async function getAgentWork(
  token?: string,
  query: AgentWorkQuery = {},
): Promise<AgentWorkResponse> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    per_page: String(query.perPage ?? 20),
  });
  if (query.state) params.set("state", query.state);
  if (query.q?.trim()) params.set("q", query.q.trim());
  const response = await fetch(`/api/agent/listings?${params}`, {
    headers: agentAuthHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not load agent listings");
  }
  return response.json() as Promise<AgentWorkResponse>;
}

export async function getAgentMetrics(token?: string): Promise<AgentMetrics> {
  const response = await fetch("/api/agent/metrics", {
    headers: agentAuthHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not load agent metrics");
  }
  const payload = (await response.json()) as { data?: AgentMetrics } & AgentMetrics;
  return payload.data ?? payload;
}

export async function getGrandfatheredOwnedListings(
  token?: string,
  page = 1,
): Promise<{ data: GrandfatheredOwnedListing[] }> {
  const response = await fetch(`/api/agent/owned_listings?page=${page}`, {
    headers: agentAuthHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await lifecycleApiError(
      response,
      "Could not load grandfathered owned listings",
    );
  }
  return response.json() as Promise<{ data: GrandfatheredOwnedListing[] }>;
}

export async function runDuplicateListingPreflight(
  input: DuplicatePreflightInput,
  token?: string,
): Promise<DuplicateAssessment> {
  const response = await fetch("/api/agent/listings/duplicate_preflight", {
    method: "POST",
    headers: agentAuthHeaders(token),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await lifecycleApiError(response, "Duplicate check failed");
  }
  const payload = (await response.json()) as { data: DuplicateAssessment };
  return payload.data;
}

export async function getListingSources(
  slug: string,
  token?: string,
): Promise<ListingSource[]> {
  const response = await fetch(`/api/listing/${encodeURIComponent(slug)}/sources`, {
    headers: agentAuthHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not load private sources");
  }
  const payload = (await response.json()) as { data: ListingSource[] };
  return payload.data;
}

export async function createListingSource(
  slug: string,
  input: Pick<ListingSource, "url" | "source_type" | "is_primary">,
  token?: string,
): Promise<ListingSource> {
  const response = await fetch(`/api/listing/${encodeURIComponent(slug)}/sources`, {
    method: "POST",
    headers: agentAuthHeaders(token),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not add source");
  }
  const payload = (await response.json()) as { data: ListingSource };
  return payload.data;
}

export async function getListingInternalNotes(
  slug: string,
  token?: string,
): Promise<ListingInternalNote[]> {
  const response = await fetch(
    `/api/listing/${encodeURIComponent(slug)}/internal_notes`,
    {
      headers: agentAuthHeaders(token),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not load internal notes");
  }
  const payload = (await response.json()) as { data: ListingInternalNote[] };
  return payload.data;
}

export async function createListingInternalNote(
  slug: string,
  body: string,
  token?: string,
): Promise<ListingInternalNote> {
  const response = await fetch(
    `/api/listing/${encodeURIComponent(slug)}/internal_notes`,
    {
      method: "POST",
      headers: agentAuthHeaders(token),
      body: JSON.stringify({ body }),
    },
  );
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not add internal note");
  }
  const payload = (await response.json()) as { data: ListingInternalNote };
  return payload.data;
}

function operationsParams(query: OperationsQuery): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    per_page: String(query.perPage ?? 20),
  });
  if (query.q?.trim()) params.set("q", query.q.trim());
  return params;
}

export async function getAdminStewardshipQueue(
  token?: string,
  query: OperationsQuery = {},
): Promise<PaginatedOperationsResponse<AdminStewardshipQueueItem>> {
  const params = operationsParams(query);
  const response = await fetch(`/api/admin/stewardship/unassigned_queue?${params}`, {
    headers: agentAuthHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not load stewardship queue");
  }
  return response.json() as Promise<PaginatedOperationsResponse<AdminStewardshipQueueItem>>;
}

export async function getEligibleStewardshipAgents(
  token?: string,
): Promise<EligibleStewardshipAgent[]> {
  const response = await fetch("/api/admin/stewardship/eligible_agents", {
    headers: agentAuthHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not load eligible agents");
  }
  const payload = (await response.json()) as {
    data: EligibleStewardshipAgent[];
  };
  return payload.data;
}

export async function assignListingSteward(
  slug: string,
  agentId: number,
  reassign: boolean,
  token?: string,
): Promise<void> {
  const operation = reassign ? "reassign" : "assign";
  const response = await fetch(
    `/api/admin/listings/${encodeURIComponent(slug)}/stewardship/${operation}`,
    {
      method: "POST",
      headers: agentAuthHeaders(token),
      body: JSON.stringify({ agent_id: agentId }),
    },
  );
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not update stewardship");
  }
}

export async function getAdminPendingRevisions(
  token?: string,
  query: OperationsQuery = {},
): Promise<PaginatedOperationsResponse<AdminPendingRevision>> {
  const params = operationsParams(query);
  const response = await fetch(`/api/admin/revisions?${params}`, {
    headers: agentAuthHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not load pending revisions");
  }
  return response.json() as Promise<PaginatedOperationsResponse<AdminPendingRevision>>;
}

export async function decideAdminListingRevision(
  revision: AdminPendingRevision,
  decision: "approve" | "changes_requested" | "reject",
  reason: string,
  token?: string,
): Promise<void> {
  const response = await fetch(
    `/api/admin/revisions/${revision.id}/decision`,
    {
      method: "PATCH",
      headers: agentAuthHeaders(token),
      body: JSON.stringify({
        decision,
        reason: reason.trim() || undefined,
        expected_listing_content_version: revision.listing.content_version,
        expected_revision_version: revision.revision_version,
      }),
    },
  );
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not decide revision");
  }
}

export async function getOpenListingRevision(
  slug: string,
  token?: string,
): Promise<ListingContentRevision | null> {
  const response = await fetch(
    `/api/listing/${encodeURIComponent(slug)}/open_revision`,
    {
      headers: agentAuthHeaders(token),
      cache: "no-store",
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not load open revision");
  }
  const payload = (await response.json()) as { data: ListingContentRevision };
  return payload.data;
}

export async function createListingContentRevision(
  slug: string,
  token?: string,
): Promise<ListingContentRevision> {
  const response = await fetch(
    `/api/listing/${encodeURIComponent(slug)}/revisions`,
    {
      method: "POST",
      headers: agentAuthHeaders(token),
      body: JSON.stringify({}),
    },
  );
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not open revision");
  }
  const payload = (await response.json()) as { data: ListingContentRevision };
  return payload.data;
}

export async function updateListingContentRevision(
  revision: ListingContentRevision,
  proposedChanges: Record<string, unknown>,
  token?: string,
): Promise<ListingContentRevision> {
  const response = await fetch(`/api/revisions/${revision.id}`, {
    method: "PATCH",
    headers: agentAuthHeaders(token),
    body: JSON.stringify({
      expected_revision_version: revision.revision_version,
      proposed_changes: proposedChanges,
    }),
  });
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not save revision");
  }
  const payload = (await response.json()) as { data: ListingContentRevision };
  return payload.data;
}

export async function submitListingContentRevision(
  revision: ListingContentRevision,
  token?: string,
): Promise<ListingContentRevision> {
  const operation =
    revision.status === "changes_requested" ? "resubmit" : "submit";
  const response = await fetch(
    `/api/revisions/${revision.id}/${operation}`,
    {
      method: "POST",
      headers: agentAuthHeaders(token),
      body: JSON.stringify({}),
    },
  );
  if (!response.ok) {
    throw await lifecycleApiError(response, "Could not submit revision");
  }
  const payload = (await response.json()) as { data: ListingContentRevision };
  return payload.data;
}

export async function getAdminDuplicateAssessments(
  token?: string,
  query: OperationsQuery = {},
): Promise<PaginatedOperationsResponse<AdminDuplicateAssessment>> {
  const params = operationsParams(query);
  const response = await fetch(`/api/admin/duplicate_assessments?${params}`, {
    headers: agentAuthHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await lifecycleApiError(
      response,
      "Could not load duplicate assessments",
    );
  }
  return response.json() as Promise<PaginatedOperationsResponse<AdminDuplicateAssessment>>;
}

export async function resolveAdminDuplicateAssessment(
  assessmentId: number,
  resolution: "distinct" | "duplicate",
  reason: string,
  token?: string,
): Promise<void> {
  const response = await fetch(
    `/api/admin/duplicate_assessments/${assessmentId}/resolve`,
    {
      method: "PATCH",
      headers: agentAuthHeaders(token),
      body: JSON.stringify({ resolution, reason }),
    },
  );
  if (!response.ok) {
    throw await lifecycleApiError(
      response,
      "Could not resolve duplicate assessment",
    );
  }
}
