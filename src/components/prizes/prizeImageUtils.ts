interface ItemImageSource {
  imageUrl?: string | null;
  displayOrder?: number | null;
  isCover?: boolean | null;
}

interface PrizeImageSource {
  imageUrl?: string | null;
  imageUrls?: Array<string | null | undefined> | null;
  itemImages?: ItemImageSource[] | null;
}

const normalizeImageUrl = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const collectUniqueUrls = (values: Array<string | null | undefined>): string[] => {
  const urls: string[] = [];

  values.forEach(value => {
    const normalized = normalizeImageUrl(value);
    if (!normalized || urls.includes(normalized)) {
      return;
    }
    urls.push(normalized);
  });

  return urls;
};

const getOrderedItemImageUrls = (itemImages: ItemImageSource[] | null | undefined): string[] => {
  if (!itemImages?.length) {
    return [];
  }

  const sorted = [...itemImages].sort((a, b) => {
    const aOrder = typeof a.displayOrder === 'number' ? a.displayOrder : null;
    const bOrder = typeof b.displayOrder === 'number' ? b.displayOrder : null;

    if (aOrder === null && bOrder === null) return 0;
    if (aOrder === null) return 1;
    if (bOrder === null) return -1;
    return aOrder - bOrder;
  });

  return collectUniqueUrls(sorted.map(image => image.imageUrl));
};

export const resolvePrizeImages = (
  source: PrizeImageSource,
): {
  imageUrls: string[];
  coverImageIndex: number;
  coverImageUrl?: string;
} => {
  const imageUrlsFromField = collectUniqueUrls(source.imageUrls ?? []);
  const imageUrlsFromItems = getOrderedItemImageUrls(source.itemImages);
  const legacyCoverUrl = normalizeImageUrl(source.imageUrl);

  const imageUrls =
    imageUrlsFromField.length > 0
      ? [...imageUrlsFromField]
      : imageUrlsFromItems.length > 0
        ? [...imageUrlsFromItems]
        : [];

  if (!imageUrls.length && legacyCoverUrl) {
    imageUrls.push(legacyCoverUrl);
  }

  if (legacyCoverUrl && !imageUrls.includes(legacyCoverUrl)) {
    imageUrls.unshift(legacyCoverUrl);
  }

  if (!imageUrls.length) {
    return {
      imageUrls: [],
      coverImageIndex: 0,
      coverImageUrl: undefined,
    };
  }

  const explicitCoverUrl = normalizeImageUrl(
    source.itemImages?.find(image => image.isCover)?.imageUrl,
  );

  const coverFromExplicitFlag = explicitCoverUrl ? imageUrls.indexOf(explicitCoverUrl) : -1;
  const coverFromLegacyField = legacyCoverUrl ? imageUrls.indexOf(legacyCoverUrl) : -1;

  const coverImageIndex =
    coverFromExplicitFlag >= 0
      ? coverFromExplicitFlag
      : coverFromLegacyField >= 0
        ? coverFromLegacyField
        : 0;

  return {
    imageUrls,
    coverImageIndex,
    coverImageUrl: imageUrls[coverImageIndex],
  };
};
