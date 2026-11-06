import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Page, ProductCard } from "@/components/shell";
import { useStore } from "@/lib/store";
import { Search, SlidersHorizontal, X } from "lucide-react";

export function SearchPage() {
  const { products } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [priceSort, setPriceSort] = useState<"none" | "low" | "high">("none");

  const categories = ["All", "Club", "National"];

  const filtered = useMemo(() => {
    return products
      .filter((p: any) => {
        const matchesQuery =
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.team.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase());

        const matchesCat =
          selectedCategory === "All" ||
          p.category.toLowerCase() === selectedCategory.toLowerCase();

        return matchesQuery && matchesCat;
      })
      .sort((a: any, b: any) => {
        if (priceSort === "low") return a.price - b.price;
        if (priceSort === "high") return b.price - a.price;
        return 0;
      });
  }, [products, query, selectedCategory, priceSort]);

  return (
    <Page>
      <div className="section-title">Search & Browse Catalog</div>

      {/* Search Input Bar */}
      <div className="relative mb-4">
        <input
          type="text"
          className="field text-sm py-3 pl-10 pr-10"
          placeholder="Search by team (e.g. Arsenal, Uganda, Real Madrid)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="chips my-0">
          {categories.map((c) => (
            <button
              key={c}
              className={`pill transition ${selectedCategory === c ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory(c);
                setSearchParams(c === "All" ? {} : { category: c });
              }}
            >
              {c === "All" ? "All Collections" : c + " Teams"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            value={priceSort}
            onChange={(e) => setPriceSort(e.target.value as any)}
          >
            <option value="none">Featured</option>
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Product Results */}
      <div className="section-row mb-3">
        <span className="text-xs text-muted-foreground">
          Showing <b>{filtered.length}</b> {filtered.length === 1 ? "jersey" : "jerseys"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="panel p-10 text-center space-y-3">
          <p className="font-display text-xl">No matching kits found</p>
          <p className="muted text-xs">Try clearing your search query or switching collections.</p>
          <button
            onClick={() => {
              setQuery("");
              setSelectedCategory("All");
            }}
            className="btn-gold text-xs py-2 px-4"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map((p: any) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </Page>
  );
}
