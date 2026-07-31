import { api } from "@/convex/_generated/api";
import { adminQuery } from "@/lib/admin/convex";
import { hasSession } from "@/lib/admin/guard";
import { formatDate } from "@/lib/admin/format";
import { PAYMENT_METHOD } from "../../../strings";

/**
 * CSV export of the payment ledger. A Route Handler rather than a Server
 * Action because the response IS the file — actions cannot stream a download.
 * Semicolon-separated with a UTF-8 BOM so Excel on a Windows machine opens it
 * with correct columns and correct č/ć/š/ž.
 */

function csvCell(value: string | number): string {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  if (!(await hasSession())) {
    return new Response("unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const from = Number(url.searchParams.get("from"));
  const to = Number(url.searchParams.get("to"));

  const data = await adminQuery(api.admin.listPayments, {
    from: Number.isFinite(from) && from > 0 ? from : undefined,
    to: Number.isFinite(to) && to > 0 ? to : undefined,
  });

  const header = ["Datum", "Firma", "Iznos (EUR)", "Nacin", "Broj racuna", "Beleska"];
  const lines = [
    header.join(";"),
    ...data.items.map((payment) =>
      [
        formatDate(payment.paidAt),
        payment.companyName,
        payment.amountEur.toFixed(2).replace(".", ","),
        PAYMENT_METHOD[payment.method] ?? payment.method,
        payment.invoiceNo,
        payment.note,
      ]
        .map(csvCell)
        .join(";"),
    ),
    ["UKUPNO", "", data.total.toFixed(2).replace(".", ","), "", "", ""].join(";"),
  ];

  return new Response(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="uplate-carigradski-drum.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
