export function mapToGeoLocation(latitude?: number, longitude?: number) {
    if (latitude === undefined || longitude === undefined) {
        return null;
    }

    return {
        type: 'Point',
        coordinates: [longitude, latitude]
    }
}