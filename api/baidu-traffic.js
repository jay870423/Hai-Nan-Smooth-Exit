export default async function handler(req, res) {
  const { lat, lng } = req.query;
  // Use env var or fallback to the provided key
  const AK = process.env.BAIDU_MAP_API_KEY || 'fLDbS927MLOqY5XcF2cPYNiHxzS9psbC';

  if (!AK) {
    console.error("Missing Baidu API Key");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  try {
    // Define a small bounding box (approx 500m-1km radius) around the checkpoint
    const delta = 0.005; 
    const minLat = parseFloat(lat) - delta;
    const maxLat = parseFloat(lat) + delta;
    const minLng = parseFloat(lng) - delta;
    const maxLng = parseFloat(lng) + delta;

    // Baidu Traffic Rectangular Query API
    // Doc: https://lbsyun.baidu.com/index.php?title=webapi/traffic_v1
    const url = `https://api.map.baidu.com/traffic/v1/bound?ak=${AK}&bounds=${minLat},${minLng};${maxLat},${maxLng}&coord_type_input=wgs84`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 0) {
        // Baidu API returned an error (or no data for this area)
        console.warn('Baidu API Response Status:', data.status, data.message);
        return res.status(200).json({ 
            trafficStatus: 'GREEN', 
            description: '路况数据暂缺' 
        });
    }

    const roads = data.road_traffic || [];

    if (roads.length === 0) {
        return res.status(200).json({ trafficStatus: 'GREEN', description: '周边畅通' });
    }

    // Calculate average congestion index
    // Baidu Status: 0:Unknown, 1:Smooth, 2:Slow, 3:Congestion, 4:Severe Congestion
    let maxStatus = 0;

    roads.forEach(road => {
        const status = road.status || 1;
        if (status > maxStatus) maxStatus = status;
    });

    let finalStatus = 'GREEN';
    let desc = '道路畅通';

    if (maxStatus === 4) {
        finalStatus = 'RED';
        desc = '严重拥堵';
    } else if (maxStatus === 3) {
        finalStatus = 'RED';
        desc = '车多拥堵';
    } else if (maxStatus === 2) {
        finalStatus = 'YELLOW';
        desc = '行车缓慢';
    }

    return res.status(200).json({ 
        trafficStatus: finalStatus, 
        description: desc,
        raw: roads.length // Debug info
    });

  } catch (error) {
    console.error('Baidu API Fetch Error:', error);
    // Fail gracefully so the frontend doesn't break
    return res.status(200).json({ trafficStatus: 'GREEN', description: 'API连接超时' });
  }
}