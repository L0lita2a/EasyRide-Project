// mock-data.js — Static demo data for GitHub Pages deployment
// All backend API calls are intercepted and replaced with this data.

const DEMO_CARS = [
    {
        id: 1,
        name: 'Honda Civic',
        category: 'Economy',
        price_per_day: 45,
        image_url: 'images/civic.png',
        transmission: 'Automatic',
        seats: 5,
        fuel: 'Petrol'
    },
    {
        id: 2,
        name: 'Kia Sportage',
        category: 'SUV',
        price_per_day: 65,
        image_url: 'images/kia.png',
        transmission: 'Automatic',
        seats: 5,
        fuel: 'Diesel'
    },
    {
        id: 3,
        name: 'Ford Mustang',
        category: 'Sports',
        price_per_day: 120,
        image_url: 'images/mustang.png',
        transmission: 'Manual',
        seats: 4,
        fuel: 'Petrol'
    },
    {
        id: 4,
        name: 'Toyota RAV4',
        category: 'SUV',
        price_per_day: 75,
        image_url: 'images/rav4.png',
        transmission: 'Automatic',
        seats: 5,
        fuel: 'Hybrid'
    },
    {
        id: 5,
        name: 'Tesla Model 3',
        category: 'Electric',
        price_per_day: 110,
        image_url: 'images/tesla.png',
        transmission: 'Automatic',
        seats: 5,
        fuel: 'Electric'
    },
    {
        id: 6,
        name: 'Jeep Wrangler',
        category: 'Off-Road',
        price_per_day: 95,
        image_url: 'images/wrangler.png',
        transmission: 'Manual',
        seats: 4,
        fuel: 'Petrol'
    }
];

const DEMO_BOOKINGS = [
    {
        id: 1,
        car_name: 'Tesla Model 3',
        image_url: 'images/tesla.png',
        pickup_date: '2026-04-10',
        return_date: '2026-04-13',
        province: 'Istanbul',
        landmark: 'Taksim Square',
        phone_number: '+1 555-0101',
        payment_method: 'Credit Card',
        total_price: '330.00',
        status: 'Confirmed'
    },
    {
        id: 2,
        car_name: 'Ford Mustang',
        image_url: 'images/mustang.png',
        pickup_date: '2026-03-20',
        return_date: '2026-03-22',
        province: 'Ankara',
        landmark: 'Kızılay',
        phone_number: '+1 555-0102',
        payment_method: 'Pay at Pickup',
        total_price: '240.00',
        status: 'Confirmed'
    },
    {
        id: 3,
        car_name: 'Kia Sportage',
        image_url: 'images/kia.png',
        pickup_date: '2026-02-14',
        return_date: '2026-02-16',
        province: 'Izmir',
        landmark: 'Konak Pier',
        phone_number: '+1 555-0103',
        payment_method: 'Credit Card',
        total_price: '130.00',
        status: 'Cancelled'
    }
];
