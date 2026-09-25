"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function ProductImageGallery({ images, productName }: { images: string[]; productName: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const selectedImage = images[selectedIndex] || images[0];

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setLightboxOpen(true)} className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-gray-100 text-left dark:bg-gray-800" aria-label={`Expand ${productName} image`}>
        <Image
          src={selectedImage}
          alt={productName}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="h-full w-full object-cover object-center"
        />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"><Maximize2 className="h-3.5 w-3.5" /> View image</span>
      </button>

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

      <Dialog open={lightboxOpen} onOpenChange={(open) => setLightboxOpen(open)}>
        <DialogContent className="max-w-[calc(100%-1rem)] bg-black p-1 sm:max-w-5xl" showCloseButton>
          <div className="relative h-[80vh] max-h-[760px] w-full overflow-hidden rounded-lg">
            <Image src={selectedImage} alt={productName} fill sizes="100vw" className="object-contain" />
          </div>
          <p className="px-3 pb-2 text-center text-xs font-medium text-white">Image {selectedIndex + 1} of {images.length}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
