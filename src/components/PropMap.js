import React from 'react'
import { withScriptjs, withGoogleMap, GoogleMap, Marker } from "react-google-maps"
import MarkerClusterer from "react-google-maps/lib/components/addons/MarkerClusterer";

/**/

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}

function getColor(min, max, value) {
  value = (value - min) / (max - min);
  let r = 255;
  let g = 0;
  if (value > .5) {
    g = 255;
    r -= Math.floor(255 * (value - .5) / .5);
  } else {
    g = Math.floor(255 * (value) / .5);
  }
  return "#" + componentToHex(r) + componentToHex(g) + "00";
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function mapMarkers(props) {
  return props.markers.map((property, index) =>
    <Marker
      icon={{
        path: 'M 7.5 0.234375 C 3.484375 0.234375 0.234375 3.484375 0.234375 7.5 C 0.234375 11.515625 3.484375 14.765625 7.5 14.765625 C 11.515625 14.765625 14.765625 11.515625 14.765625 7.5 C 14.765625 3.484375 11.515625 0.234375 7.5 0.234375 Z M 7.5 0.234375',
        fillColor: getColor(props.min, props.max, property.ESTIMATED_MARKET_VALUE, property),
        strokeColor: getColor(props.min, props.max, property.ESTIMATED_MARKET_VALUE, property),
        fillOpacity: 1,
        scale: 1
      }}
      title={`$${numberWithCommas(property.ESTIMATED_MARKET_VALUE)} - ${numberWithCommas(property.Full_Address)}`}
      key={property.Full_Address + index}
      position={{ lat: property.Longitude, lng: property.Latitude }}
      className="marker"
      options={{ property: property }}
      noRedraw
    />
  )
}

const PropMap = withScriptjs(withGoogleMap((props) => {
  return (
    <GoogleMap
      defaultZoom={12}
      defaultCenter={{ lat: 41.90003, lng: -87.65005 }}
    >
      {props.clustering ? (
        <MarkerClusterer
          calculator={(arr, len) => {
            let min = Number.MAX_SAFE_INTEGER;
            let max = Number.MIN_SAFE_INTEGER;
            for (let i = 0; i < arr.length; i++) {
              min = Math.min(min, arr[i].property.ESTIMATED_MARKET_VALUE);
              max = Math.max(max, arr[i].property.ESTIMATED_MARKET_VALUE);
            }
            let index = 0;
            while (index < len && Math.pow(10, index) < arr.length) {
              index++;
            }
            return { title: `$${numberWithCommas(min)}-$${numberWithCommas(max)}`, index: index, text: arr.length };
          }}
          enableRetinaIcons
        >
          {mapMarkers(props)}
        </MarkerClusterer>
      ) : (
          <div>
            {mapMarkers(props)}
          </div>
        )}
    </GoogleMap>
  )
}));

export default PropMap;
