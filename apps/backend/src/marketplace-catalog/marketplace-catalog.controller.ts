import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/roles.decorator';
import { MarketplaceCatalogService } from './marketplace-catalog.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { SellersQueryDto } from './dto/sellers-query.dto';

/**
 * PERF-CACHE — Durées de cache pour les endpoints publics.
 *
 * `s-maxage` : TTL côté CDN/reverse-proxy (Nginx, Cloudflare).
 * `max-age` : TTL côté navigateur.
 * `stale-while-revalidate` : sert la version stale pendant le revalidate.
 *
 * Valeurs conservatrices pour la beta (données changent peu) :
 *  - catalogue/sellers : 60s CDN, 30s browser, 120s SWR
 *  - fiches détail : 120s CDN, 60s browser, 300s SWR
 *  - stats/categories : 300s CDN, 120s browser, 600s SWR
 */
const CACHE_LIST = 'public, s-maxage=60, max-age=30, stale-while-revalidate=120';
const CACHE_DETAIL = 'public, s-maxage=120, max-age=60, stale-while-revalidate=300';
const CACHE_STATIC = 'public, s-maxage=300, max-age=120, stale-while-revalidate=600';

@ApiTags('marketplace - catalog (public)')
@Controller('marketplace/catalog')
export class MarketplaceCatalogController {
  constructor(private service: MarketplaceCatalogService) {}

  @Public()
  @Get()
  @Header('Cache-Control', CACHE_LIST)
  @ApiOperation({ summary: 'Catalogue public (offres publiées uniquement, filtres & tri)' })
  catalog(@Query() query: CatalogQueryDto) {
    return this.service.findCatalog(query);
  }

  @Public()
  @Get('products/:slug')
  @Header('Cache-Control', CACHE_DETAIL)
  @ApiOperation({ summary: 'Fiche produit marketplace (par slug)' })
  productBySlug(@Param('slug') slug: string) {
    return this.service.findProductBySlug(slug);
  }

  // CATALOG-STATS — compteurs publics (produits, sellers, pays) pour le hero.
  @Public()
  @Get('stats')
  @Header('Cache-Control', CACHE_STATIC)
  @ApiOperation({ summary: 'Statistiques publiques du catalogue (compteurs)' })
  stats() {
    return this.service.stats();
  }

  // SEARCH-FULLTEXT — autocomplete/suggestions sur produits + vendeurs.
  @Public()
  @Get('suggest')
  @Header('Cache-Control', CACHE_LIST)
  @ApiOperation({ summary: 'Suggestions autocomplétion (produits + vendeurs)' })
  suggest(@Query('q') q: string) {
    return this.service.suggest(q ?? '');
  }

  // MP-CATEGORY-2 — arborescence publique des catégories actives.
  @Public()
  @Get('categories')
  @Header('Cache-Control', CACHE_STATIC)
  @ApiOperation({ summary: 'Arborescence publique des catégories actives' })
  categoriesTree() {
    return this.service.findCategoriesTree();
  }

  // MP-S-INDEX — La route `sellers` (liste) DOIT être déclarée AVANT
  // `sellers/:slug` (fiche détail), sinon Express considère "sellers" comme
  // un slug et appelle la mauvaise méthode. Ne pas réordonner.
  @Public()
  @Get('sellers')
  @Header('Cache-Control', CACHE_LIST)
  @ApiOperation({
    summary: 'Annuaire public des vendeurs APPROVED (filtres, tri, pagination)',
  })
  listSellers(@Query() query: SellersQueryDto) {
    return this.service.listSellers(query);
  }

  @Public()
  @Get('sellers/:slug')
  @Header('Cache-Control', CACHE_DETAIL)
  @ApiOperation({ summary: 'Page publique du vendeur (par slug)' })
  sellerBySlug(@Param('slug') slug: string) {
    return this.service.findSellerBySlug(slug);
  }
}
