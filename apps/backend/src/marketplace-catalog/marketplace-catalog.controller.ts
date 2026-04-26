import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/roles.decorator';
import { MarketplaceCatalogService } from './marketplace-catalog.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { SellersQueryDto } from './dto/sellers-query.dto';

@ApiTags('marketplace - catalog (public)')
@Controller('marketplace/catalog')
export class MarketplaceCatalogController {
  constructor(private service: MarketplaceCatalogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Catalogue public (offres publiées uniquement, filtres & tri)' })
  catalog(@Query() query: CatalogQueryDto) {
    return this.service.findCatalog(query);
  }

  @Public()
  @Get('products/:slug')
  @ApiOperation({ summary: 'Fiche produit marketplace (par slug)' })
  productBySlug(@Param('slug') slug: string) {
    return this.service.findProductBySlug(slug);
  }

  // MP-S-INDEX — La route `sellers` (liste) DOIT être déclarée AVANT
  // `sellers/:slug` (fiche détail), sinon Express considère "sellers" comme
  // un slug et appelle la mauvaise méthode. Ne pas réordonner.
  @Public()
  @Get('sellers')
  @ApiOperation({
    summary: 'Annuaire public des vendeurs APPROVED (filtres, tri, pagination)',
  })
  listSellers(@Query() query: SellersQueryDto) {
    return this.service.listSellers(query);
  }

  @Public()
  @Get('sellers/:slug')
  @ApiOperation({ summary: 'Page publique du vendeur (par slug)' })
  sellerBySlug(@Param('slug') slug: string) {
    return this.service.findSellerBySlug(slug);
  }
}
