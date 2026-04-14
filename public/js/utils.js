function conditionIcon(condition) {
    const c = (condition || '').toLowerCase();
    let img;
    if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard'))                                                      img = 'snowy.png';
    else if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder') || c.includes('storm') || c.includes('shower')) img = 'rainy.png';
    else if (c.includes('cloud') || c.includes('overcast') || c.includes('mist') || c.includes('fog') || c.includes('haze'))      img = 'cloudy.png';
    else                                                                                                                           img = 'sunny.png';
    return `<img src="./images/${img}" alt="" style="width:64px; height:64px; object-fit:contain; flex-shrink:0; margin-bottom:16px;">`;
}
