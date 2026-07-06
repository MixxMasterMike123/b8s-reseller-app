// usePodLibrary — single shared load of the shop's POD data for the whole admin page.
//
// One fetch feeds ALL consumers: the page-level "unmapped artwork" warning banner,
// the Original tab (ArtworkLibrary), and the Produktkoppling tab (ProductMapping).
// Lifting it here avoids duplicate Firestore reads per tab and keeps every surface
// consistent (e.g. delete/create in one tab refreshes the banner + the other tab).
//
// All reads are shop-scoped (where shopId) via the underlying utils. Products are
// READ-ONLY here — POD owns mappings, products stay untouched (locked architecture).
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { listMappings, listShopProductSkus } from '../../../utils/podMappings';
import { listArtwork } from '../../../utils/podArtwork';
import { loadPodProfiles } from '../../../config/podProfiles';

export default function usePodLibrary(shopId) {
  const [mappings, setMappings] = useState([]);
  const [artwork, setArtwork] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSkus, setProductSkus] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [maps, arts, profs, prods] = await Promise.all([
        listMappings(shopId),
        listArtwork(shopId),
        loadPodProfiles(),
        listShopProductSkus(shopId),
      ]);
      setMappings(maps);
      setArtwork(arts);
      setProfiles(profs);
      setProducts(prods.products || []);
      setProductSkus(prods.skus || new Set());
    } catch (e) {
      console.error('usePodLibrary load failed:', e);
      toast.error('Kunde inte ladda POD-data.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { refresh(); }, [refresh]);

  // The set of artworkIds referenced by at least one mapping. An artwork NOT in
  // this set is unmapped → orders never reach the print queue for it. This is the
  // loud state the banner + library chips surface.
  const mappedArtworkIds = useMemo(() => {
    const s = new Set();
    mappings.forEach((m) => { if (m.artworkId) s.add(m.artworkId); });
    return s;
  }, [mappings]);

  const unmappedArtwork = useMemo(
    () => artwork.filter((a) => !mappedArtworkIds.has(a.id)),
    [artwork, mappedArtworkIds]
  );

  return {
    mappings, artwork, profiles, products, productSkus,
    mappedArtworkIds, unmappedArtwork,
    loading, refresh,
  };
}
