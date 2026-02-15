#!/bin/bash

# Revert all the duplicate classes back to original

# Fix ProfilePage
sed -i 's/text-gray-900 dark:text-gray-100 dark:text-gray-100/text-gray-900/g' frontend/src/components/ProfilePage.tsx
sed -i 's/text-gray-900 dark:text-gray-100/text-gray-900/g' frontend/src/components/ProfilePage.tsx
sed -i 's/bg-white\/50 dark:bg-gray-800\/50 dark:bg-gray-800\/50/bg-white\/50/g' frontend/src/components/ProfilePage.tsx
sed -i 's/bg-white\/50 dark:bg-gray-800\/50/bg-white\/50/g' frontend/src/components/ProfilePage.tsx
sed -i 's/border-gray-200 dark:border-gray-600 dark:border-gray-600/border-gray-200/g' frontend/src/components/ProfilePage.tsx
sed -i 's/border-gray-200 dark:border-gray-600/border-gray-200/g' frontend/src/components/ProfilePage.tsx

# Fix all patient pages
for file in frontend/src/app/patient/*.tsx frontend/src/app/patient/*/*.tsx; do
  if [ -f "$file" ]; then
    sed -i 's/text-gray-900 dark:text-gray-100 dark:text-gray-100/text-gray-900/g' "$file"
    sed -i 's/text-gray-900 dark:text-gray-100/text-gray-900/g' "$file"
    sed -i 's/bg-white\/50 dark:bg-gray-800\/50 dark:bg-gray-800\/50/bg-white\/50/g' "$file"
    sed -i 's/bg-white\/50 dark:bg-gray-800\/50/bg-white\/50/g' "$file"
    sed -i 's/border-gray-200 dark:border-gray-600 dark:border-gray-600/border-gray-200/g' "$file"
    sed -i 's/border-gray-200 dark:border-gray-600/border-gray-200/g' "$file"
  fi
done

# Fix all doctor pages
for file in frontend/src/app/doctor/*.tsx frontend/src/app/doctor/*/*.tsx; do
  if [ -f "$file" ]; then
    sed -i 's/text-gray-900 dark:text-gray-100 dark:text-gray-100/text-gray-900/g' "$file"
    sed -i 's/text-gray-900 dark:text-gray-100/text-gray-900/g' "$file"
    sed -i 's/text-red-900 dark:text-red-100 dark:text-red-100/text-red-900/g' "$file"
    sed -i 's/text-red-900 dark:text-red-100/text-red-900/g' "$file"
    sed -i 's/text-yellow-900 dark:text-yellow-100 dark:text-yellow-100/text-yellow-900/g' "$file"
    sed -i 's/text-yellow-900 dark:text-yellow-100/text-yellow-900/g' "$file"
    sed -i 's/bg-white\/50 dark:bg-gray-800\/50 dark:bg-gray-800\/50/bg-white\/50/g' "$file"
    sed -i 's/bg-white\/50 dark:bg-gray-800\/50/bg-white\/50/g' "$file"
    sed -i 's/bg-red-50 dark:bg-red-900\/20 dark:bg-red-900\/20/bg-red-50/g' "$file"
    sed -i 's/bg-red-50 dark:bg-red-900\/20/bg-red-50/g' "$file"
    sed -i 's/bg-yellow-50 dark:bg-yellow-900\/20 dark:bg-yellow-900\/20/bg-yellow-50/g' "$file"
    sed -i 's/bg-yellow-50 dark:bg-yellow-900\/20/bg-yellow-50/g' "$file"
    sed -i 's/border-gray-200 dark:border-gray-600 dark:border-gray-600/border-gray-200/g' "$file"
    sed -i 's/border-gray-200 dark:border-gray-600/border-gray-200/g' "$file"
  fi
done

# Fix all admin pages
for file in frontend/src/app/admin/*.tsx frontend/src/app/admin/*/*.tsx; do
  if [ -f "$file" ]; then
    sed -i 's/text-gray-900 dark:text-gray-100 dark:text-gray-100/text-gray-900/g' "$file"
    sed -i 's/text-gray-900 dark:text-gray-100/text-gray-900/g' "$file"
    sed -i 's/bg-white\/50 dark:bg-gray-800\/50 dark:bg-gray-800\/50/bg-white\/50/g' "$file"
    sed -i 's/bg-white\/50 dark:bg-gray-800\/50/bg-white\/50/g' "$file"
    sed -i 's/border-gray-200 dark:border-gray-600 dark:border-gray-600/border-gray-200/g' "$file"
    sed -i 's/border-gray-200 dark:border-gray-600/border-gray-200/g' "$file"
  fi
done

echo "✅ Reverted all changes back to original"
