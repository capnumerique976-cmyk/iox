// Search controller — public endpoints for marketplace search.
//
// GET /marketplace/search/products  (public)
// GET /marketplace/search/sellers   (public)
// POST /admin/search/reindex        (admin only)

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public, Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';

@ApiTags('search')
@Controller()
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly indexer: SearchIndexerService,
  ) {}

  @Get('marketplace/search/products')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @ApiOperation({
    summary: 'Full-text search products (MeiliSearch with Postgres fallback)',
  })
  async searchProducts(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('country') country?: string,
    @Query('certifications') certifications?: string,
    @Query('availabilityMonth') availabilityMonth?: string,
    @Query('moqMax') moqMax?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.searchService.searchProducts({
      q,
      category,
      country,
      certifications,
      availabilityMonth,
      moqMax: moqMax ? parseInt(moqMax, 10) : undefined,
      availableOnly: availableOnly === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sort,
    });
  }

  @Get('marketplace/search/sellers')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @ApiOperation({
    summary: 'Full-text search sellers (MeiliSearch with Postgres fallback)',
  })
  async searchSellers(
    @Query('q') q?: string,
    @Query('country') country?: string,
    @Query('region') region?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchSellers({
      q,
      country,
      region,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('admin/search/reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger full reindex of products + sellers (admin)' })
  async reindex() {
    const result = await this.indexer.reindexAll();
    return { success: true, ...result };
  }
}
