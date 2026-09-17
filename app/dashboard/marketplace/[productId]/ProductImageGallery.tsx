"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductImageGallery({ images, productName }: { images: string[]; productName: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex] || images[0];

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-gray-100 dark:bg-gray-800">
        <Image
          src={selectedImage}
          alt={productName}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="h-full w-full object-cover object-center"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2" aria-label="Product images">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`View image ${index + 1} of ${images.length}`}
              aria-pressed={selectedIndex === index}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                selectedIndex === index ? "border-blue-600" : "border-transparent hover:border-blue-300"
              }`}
            >
              <Image
                src={image}
                alt={`${productName}, image ${index + 1}`}
                fill
                sizes="(max-width: 640px) 25vw, 120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
