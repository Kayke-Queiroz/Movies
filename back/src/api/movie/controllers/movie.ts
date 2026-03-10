import { factories } from '@strapi/strapi';
import axios from 'axios';

export default factories.createCoreController('api::movie.movie', ({ strapi }) => ({
    async import(ctx) {
        const { name } = (ctx.request as any).body;

        if (!name) {
            return ctx.badRequest("Movie name is required");
        }

        // buscar filme no TMDB
        const res = await axios.get(
            "https://api.themoviedb.org/3/search/movie",
            {
                params: {
                    api_key: "fb87059a19198a25d2e02e1c7d8052dc",
                    query: name
                }
            }
        );

        const movie = res.data.results[0];

        if (!movie) {
            return ctx.badRequest("Movie not found");
        }

        // criar filme no Strapi
        const createdMovie = await strapi.entityService.create(
            "api::movie.movie",
            {
                data: {
                    title: movie.title,
                    tmdbId: movie.id,
                    rating: movie.vote_average,
                    watched: false,
                    posterUrl: `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                }
            }
        );

        return createdMovie;
    }
}));