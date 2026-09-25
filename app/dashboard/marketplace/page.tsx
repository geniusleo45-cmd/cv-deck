"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { FilterSidebar } from "@/components/marketplace/FilterSidebar";
import { Store, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function MarketplacePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    query: "",
    categoryId: "",
    condition: "",
    locationZone: "",
    minPrice: "",
    maxPrice: "",
  });

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = useCallback(async (signal: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (filters.query) params.append("query", filters.query);
      if (filters.categoryId) params.append("categoryId", filters.categoryId);
      if (filters.condition) params.append("condition", filters.condition);
      if (filters.locationZone) params.append("locationZone", filters.locationZone);
      if (filters.minPrice) params.append("minPrice", filters.minPrice);
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
      params.append("page", page.toString());

      const res = await fetch(`/api/products?${params.toString()}`, { signal });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setPagination(data.pagination);
      } else {
        const data = await res.json().catch(() => null);
        setProducts([]);
        setError(data?.error || "We could not load marketplace listings. Please try again.");
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        console.error(e);
        setError("We could not load marketplace listings. Please try again.");
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => fetchProducts(controller.signal), 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [fetchProducts, reloadKey]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters({
      query: "",
      categoryId: "",
      condition: "",
      locationZone: "",
      minPrice: "",
      maxPrice: "",
    });
    setPage(1);
  };

  const firstListing = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastListing = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Store className="h-7 w-7 text-blue-600" /> Computer Village Marketplace
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Discover laptops, smartphones, networking gear, and component repair services directly from Ikeja shops.
          </p>
        </div>
        <span className="text-xs font-bold text-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full shrink-0">
          {loading ? "Loading listings…" : `Showing ${firstListing}-${lastListing} of ${pagination.total} listings`}
        </span>
      </div>

      {/* Main Filter & Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        <FilterSidebar
          categories={categories}
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Loading Computer Village inventory...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 border rounded-2xl p-8 space-y-4">
              <Store className="h-12 w-12 text-red-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Marketplace unavailable</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((current) => current + 1)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 border rounded-2xl p-8 space-y-3">
              <Store className="h-12 w-12 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No products found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try adjusting your search criteria or resetting filters to view more listings from Computer Village vendors.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} mobileCompact />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <nav className="flex items-center justify-between border-t pt-5" aria-label="Marketplace pages">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-200"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <span className="text-xs font-medium text-gray-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-200"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
