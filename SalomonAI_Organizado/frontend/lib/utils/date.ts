export const formatShortDate = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date
    .toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(".", "")
    .toLowerCase()
}
