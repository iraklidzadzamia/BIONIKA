import { useSelector } from "react-redux";
import {
  useGetCompanyProfileQuery,
  useUpdateCompanyProfileMutation,
} from "@/core/api/companyApi";

/**
 * Hook for managing company settings data and mutations
 */
export function useCompanySettings({ currentPage = 1, pageSize = 20 } = {}) {
  const { user, company: reduxCompany } = useSelector((state) => state.auth);

  const {
    data: companyData,
    isLoading,
    error,
    refetch,
  } = useGetCompanyProfileQuery(
    {
      companyId: user?.companyId,
      page: currentPage,
      size: pageSize,
    },
    { skip: !user?.companyId }
  );

  const [updateCompanyProfile, { isLoading: isUpdating }] =
    useUpdateCompanyProfileMutation();

  const company = companyData?.company || reduxCompany;
  const companyId = user?.companyId;

  return {
    company,
    companyId,
    user,
    isLoading,
    isUpdating,
    error,
    refetch,
    updateCompanyProfile,
  };
}
