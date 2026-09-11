{!loading &&
            !error &&
            listings.length > 0 && (
              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  sm:grid-cols-2
                  sm:gap-4
                  md:grid-cols-3
                  lg:grid-cols-4
                  xl:gap-5
                "
              >

                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                  />
                ))}

              </div>
            )}
