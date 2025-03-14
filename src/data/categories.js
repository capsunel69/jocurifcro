// Helper function to get image path for a category
export const getCategoryImage = (category) => {
  // Handle cases where a category has multiple items (needs multiple images)
  if (Array.isArray(category)) {
    return category.map(item => `/images/${item.id}.webp`)
  }
  return `/images/${category.id}.webp`
}

// Helper function to get display name for a category
export const getCategoryDisplayName = (category) => {
  if (Array.isArray(category)) {
    return category.map(item => item.displayName).join(' + ')
  }
  return category.displayName
}

// Convert the remit array into a format compatible with the board
export const formatCategories = (remit) => {
  return remit.map((category, index) => ({
    id: index,
    name: getCategoryDisplayName(category),
    description: getCategoryDisplayName(category),
    image: getCategoryImage(category),
    originalData: category
  }))
}
