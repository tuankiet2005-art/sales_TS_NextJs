export function customerApiErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "Invalid customer";
  if (
    message.includes("permanent_street_line") ||
    message.includes("permanent_location_id") ||
    message.includes("temporary_street_line")
  ) {
    return "Database is missing customer address columns. Run db/add-customer-addresses.sql in Neon, or npm run migrate:customer-addresses from web/.";
  }
  if (message.startsWith("Invalid customer:")) {
    return message.slice("Invalid customer: ".length);
  }
  if (message.includes("insert into") || message.includes("Failed query")) {
    return "Could not save customer. Check the database connection and migrations.";
  }
  return message;
}
