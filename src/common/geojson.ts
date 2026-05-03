export function mapToGeoLocation(longitude?: number, latitude?: number) {
    if (longitude === undefined || latitude === undefined) {
        return null;
    }

    return {
        type: 'Point',
        coordinates: [longitude, latitude]
    }
}