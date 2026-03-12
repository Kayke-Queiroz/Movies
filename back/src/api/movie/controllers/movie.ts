import { factories } from '@strapi/strapi';
import axios from 'axios';

export default factories.createCoreController('api::movie.movie', ({ strapi }) => ({
    async find(ctx) {
        const user = ctx.state.user;
        strapi.log.info('--- DEBUG MOVIE FIND ---');
        strapi.log.info(`User Keys: ${Object.keys(user || {}).join(', ')}`);
        strapi.log.info(`User ID: ${user?.id}, User documentId: ${user?.documentId}`);

        if (!user) {
            return ctx.unauthorized("You must be logged in");
        }

        const query = { ...ctx.query } as any;
        const existingFilters = query.filters || {};

        // In Strapi 5, filtering by relation can be done via documentId or ID
        // Let's try to set it in a way that Strapi 5 find service understands
        ctx.query = {
            ...query,
            filters: {
                ...existingFilters,
                user: user.documentId || user.id,
            },
        };
        
        strapi.log.info(`Final Query Filters: ${JSON.stringify(ctx.query.filters)}`);

        try {
            // super.find uses the core service which applies permissions and sanitization
            return await super.find(ctx);
        } catch (err: any) {
            strapi.log.error(`Error in super.find: ${err.message}`);
            
            // Fallback: Use entityService directly which is less restrictive than super.find
            strapi.log.info('Attempting fallback with entityService...');
            const data = await strapi.entityService.findMany("api::movie.movie", {
                filters: {
                    user: user.id
                }
            });
            return { data, meta: {} };
        }
    },

    async import(ctx) {
        const { name } = (ctx.request as any).body;

        if (!name) {
            return ctx.badRequest("Movie name is required");
        }

        const user = ctx.state.user;

        if (!user) {
            return ctx.unauthorized("You must be logged in to import movies");
        }

        const res = await axios.get(
            "https://api.themoviedb.org/3/search/movie",
            {
                params: {
                    api_key: process.env.TMDB_API_KEY,
                    query: name
                }
            }
        );

        const movie = res.data.results[0];

        if (!movie) {
            return ctx.badRequest("Movie not found");
        }

        const createdMovie = await strapi.entityService.create(
            "api::movie.movie",
            {
                data: {
                    title: movie.title,
                    tmdbId: movie.id,
                    rating: movie.vote_average,
                    watched: false,
                    posterUrl: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                    user: user.id,
                    publishedAt: new Date(),
                }
            }
        );

        return createdMovie;
    }
}));