import type { Database } from "@/types/supabase";

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

export type ClientSummary = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  documentNumber: string | null;
};

export function clientSummary(c: ClientRow): ClientSummary {
  return {
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    documentNumber: c.document_number,
  };
}
