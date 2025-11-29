export function generateSlug(title) {
  // Convert title to normal slug
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")  // remove special characters
    .replace(/\s+/g, "-")          // spaces → hyphens
    .replace(/-+/g, "-");          // remove repeated hyphens

  // Generate 5-char random string (letters + numbers)
  const uniqueId = Math.random().toString(36).substring(2, 7);

  return `${baseSlug}-${uniqueId}`;
}