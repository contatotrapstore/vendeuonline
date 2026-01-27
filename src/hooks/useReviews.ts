import { useState, useEffect, useCallback } from "react";
import { Review } from "@/types";
import { get, post, put, del } from "@/lib/api";

interface UseReviewsReturn {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  averageRating: number;
  totalCount: number;
  createReview: (data: { productId: string; rating: number; comment: string }) => Promise<void>;
  updateReview: (reviewId: string, data: { rating: number; comment: string }) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  markHelpful: (reviewId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReviews(productId: string): UseReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch reviews for product
  const fetchReviews = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await get(`/api/reviews/${productId}`);

      if (response.success && response.data) {
        setReviews(response.data.reviews || []);
        setAverageRating(response.data.stats?.average || 0);
        setTotalCount(response.data.stats?.total || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar avaliações");
      console.error("Erro ao buscar reviews:", err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Create new review
  const createReview = useCallback(
    async (data: { productId: string; rating: number; comment: string }) => {
      setLoading(true);
      setError(null);

      try {
        const response = await post("/api/reviews", data);

        if (response.success) {
          // Refresh reviews after creation
          await fetchReviews();
        } else {
          throw new Error(response.error || "Erro ao criar avaliação");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao criar avaliação";
        setError(errorMessage);
        throw err; // Re-throw para o componente tratar
      } finally {
        setLoading(false);
      }
    },
    [fetchReviews]
  );

  // Update existing review
  const updateReview = useCallback(
    async (reviewId: string, data: { rating: number; comment: string }) => {
      setLoading(true);
      setError(null);

      try {
        const response = await put(`/api/reviews/${reviewId}`, data);

        if (response.success) {
          // Refresh reviews after update
          await fetchReviews();
        } else {
          throw new Error(response.error || "Erro ao atualizar avaliação");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao atualizar avaliação";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchReviews]
  );

  // Delete review
  const deleteReview = useCallback(
    async (reviewId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await del(`/api/reviews/${reviewId}`);

        if (response.success) {
          // Refresh reviews after deletion
          await fetchReviews();
        } else {
          throw new Error(response.error || "Erro ao deletar avaliação");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao deletar avaliação";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchReviews]
  );

  // Mark review as helpful (TODO: Implementar endpoint no backend)
  const markHelpful = useCallback(
    async (reviewId: string) => {
      // Placeholder - backend não tem este endpoint ainda
      console.log("Mark helpful:", reviewId);

      // Atualizar localmente (otimista)
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r))
      );
    },
    []
  );

  // Refresh reviews manually
  const refresh = useCallback(async () => {
    await fetchReviews();
  }, [fetchReviews]);

  // Fetch on mount and when productId changes
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    loading,
    error,
    averageRating,
    totalCount,
    createReview,
    updateReview,
    deleteReview,
    markHelpful,
    refresh,
  };
}
