import { PrismaClient, Prisma } from "../generated/prisma/client"
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
  adapter,
})

const userData: Prisma.UserCreateInput[] = [
  {
    email: "admin@bhai.gg",
    name: "Admin User",
    bio: "Platform administrator and community manager",
    country: "United States",
    state: "California",
    city: "San Francisco",
    latitude: 37.7749,
    longitude: -122.4194,
    xHandle: "bhaigg_admin",
    linkedIn: "linkedin.com/company/bhai-gg",
    role: "ADMIN",
    emailVerified: new Date(),
  },
  {
    email: "alice@example.com",
    name: "Alice Johnson",
    bio: "Full-stack developer passionate about Web3 and decentralized systems",
    country: "United Kingdom",
    state: "England",
    city: "London",
    latitude: 51.5074,
    longitude: -0.1278,
    xHandle: "alice_builds",
    linkedIn: "linkedin.com/in/alicejohnson",
    role: "CONTRIBUTOR",
    emailVerified: new Date(),
  },
  {
    email: "bob@example.com",
    name: "Bob Smith",
    bio: "Blockchain enthusiast and smart contract developer on Monad",
    country: "United States",
    state: "New York",
    city: "New York",
    latitude: 40.7128,
    longitude: -74.0060,
    xHandle: "bob_monad",
    linkedIn: "linkedin.com/in/bobsmith",
    role: "CONTRIBUTOR",
    emailVerified: new Date(),
  },
  {
    email: "carol@example.com",
    name: "Carol Williams",
    bio: "Community builder and event organizer",
    country: "Germany",
    state: "Berlin",
    city: "Berlin",
    latitude: 52.5200,
    longitude: 13.4050,
    xHandle: "carol_events",
    role: "CONTRIBUTOR",
    emailVerified: new Date(),
  },
  {
    email: "david@example.com",
    name: "David Lee",
    bio: "Product designer focused on web3 UX",
    country: "Singapore",
    city: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    xHandle: "david_design",
    linkedIn: "linkedin.com/in/davidlee",
    role: "CONTRIBUTOR",
    emailVerified: new Date(),
  },
  {
    email: "emma@example.com",
    name: "Emma Chen",
    bio: "DevRel engineer and technical writer",
    country: "Canada",
    state: "Ontario",
    city: "Toronto",
    latitude: 43.6532,
    longitude: -79.3832,
    xHandle: "emma_dev",
    linkedIn: "linkedin.com/in/emmachen",
    role: "CONTRIBUTOR",
    emailVerified: new Date(),
  },
]

export async function main() {
  console.log('🌱 Starting database seed...')

  for (const u of userData) {
    const user = await prisma.user.create({ data: u })
    console.log(`✅ Created user: ${user.name} (${user.email})`)
  }

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })