import { api } from '../../shared/api/api';
import type {
  Certificate,
  CertifiableStudent,
  CertificatePrintPayload,
  IssueCertificatePayload,
} from './certificate.model';

/* Both lists are small (a level's graduates), so the API returns plain arrays,
   not paginated pages. Issue and revoke change both lists — a newly issued
   student leaves the certifiable list and joins the issued one — so they
   invalidate `Certificate`. Reprint records a copy but changes neither list, so
   it invalidates nothing. */
const certificatesApi = api.injectEndpoints({
  endpoints: (build) => ({
    certifiable: build.query<CertifiableStudent[], void>({
      query: () => ({ path: '/certificates/certifiable' }),
      providesTags: ['Certificate'],
    }),
    certificates: build.query<Certificate[], void>({
      query: () => ({ path: '/certificates' }),
      providesTags: ['Certificate'],
    }),
    issueCertificate: build.mutation<Certificate, IssueCertificatePayload>({
      query: (body) => ({ method: 'POST', path: '/certificates', body }),
      invalidatesTags: ['Certificate'],
    }),
    reprintCertificate: build.mutation<CertificatePrintPayload, string>({
      query: (id) => ({ method: 'POST', path: `/certificates/${id}/reprint` }),
    }),
    revokeCertificate: build.mutation<Certificate, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ method: 'POST', path: `/certificates/${id}/revoke`, body: { reason } }),
      invalidatesTags: ['Certificate'],
    }),
  }),
});

export const {
  useCertifiableQuery,
  useCertificatesQuery,
  useIssueCertificateMutation,
  useReprintCertificateMutation,
  useRevokeCertificateMutation,
} = certificatesApi;
