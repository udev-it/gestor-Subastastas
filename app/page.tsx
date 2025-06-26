"use client"

import AuctioneerHeader from "@/components/auctioneer-header"
import AuctionManager from "@/components/auction-manager"

export default function Home() {
  return (
    <>
      <AuctioneerHeader />
      <div className="container mx-auto px-4 pt-16">
        <AuctionManager />
      </div>
    </>
  )
}
