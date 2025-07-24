// Test file for Travel Advisor API function
// This demonstrates the searchHotelsByGeocode function

// Travel Advisor API function
const searchHotelsByGeocode = async (latitude, longitude) => {
  console.log('🏨 Searching hotels with Travel Advisor API...');
  console.log('📍 Coordinates:', latitude, longitude);
  
  try {
    const url = `https://travel-advisor.p.rapidapi.com/hotels/list-by-latlng?latitude=${latitude}&longitude=${longitude}&lang=en_US&currency=THB`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': 'dd41c3b481msh51c9e846214042ap1395aejsn98d3615f27bb',
        'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`Travel Advisor API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Travel Advisor API response received');
    
    if (data.data && Array.isArray(data.data)) {
      console.log(`🏨 Found ${data.data.length} hotels`);
      
      // Log hotel details for each hotel
      data.data.forEach((hotel, index) => {
        console.log(`🏨 Hotel ${index + 1}:`);
        console.log(`   Name: ${hotel.name || 'N/A'}`);
        console.log(`   Rating: ${hotel.rating || 'N/A'}`);
        console.log(`   Location: ${hotel.location_string || 'N/A'}`);
        
        // Log first photo URL if available
        if (hotel.photo && hotel.photo.images && hotel.photo.images.original && hotel.photo.images.original.url) {
          console.log(`   Photo URL: ${hotel.photo.images.original.url}`);
        } else {
          console.log(`   Photo URL: Not available`);
        }
        console.log('---');
      });
      
      return data.data;
    } else {
      console.log('⚠️ No hotel data found in response');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching hotels from Travel Advisor API:', error);
    return [];
  }
};

// Test the function with Bangkok coordinates
console.log('🧪 Testing Travel Advisor API with Bangkok coordinates...');
console.log('📍 Bangkok coordinates: 13.7563, 100.5018');

// Note: This test requires a browser environment with fetch support
// In a Node.js environment, you would need to install node-fetch or use a different HTTP client

// Example usage:
// searchHotelsByGeocode(13.7563, 100.5018)
//   .then(hotels => {
//     console.log('✅ Test completed successfully');
//     console.log(`Found ${hotels.length} hotels in Bangkok`);
//   })
//   .catch(error => {
//     console.error('❌ Test failed:', error);
//   });

console.log('📝 To run this test in a browser environment:');
console.log('1. Open the browser console');
console.log('2. Copy and paste the searchHotelsByGeocode function');
console.log('3. Call: searchHotelsByGeocode(13.7563, 100.5018)');
console.log('4. Check the console output for hotel details'); 