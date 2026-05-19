import React from 'react';

function Logo() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,userSelect:"none",flexShrink:0}}>
      <svg width={30} height={30} viewBox="88 80 62 56" xmlns="http://www.w3.org/2000/svg">
        <path fill="#a2864c" d="M135.1,88.8c-3.4-3.4-4.8-4.3-8.1-5.9-6.4-3.1-15.2-3.3-21.7-.4-5.4,2.4-10.2,6.9-13,13.1-2.8,8.3-1.6,15.6-1.6,15.6h42.9s-1.3,6.3-6.7,9.6c-6.2,3.9-14.4,4.5-21.4.4-5.9-3.4-7.8-7.1-7.8-7.1h-6.7c0,0,3.4,8.6,12.8,12.8,5.2,2.3,12.3,4,19.8,1.8,7.4-2.1,14.8-9.7,16.7-17.1.7-2.6.7-6.3.7-6.3h-43.5s0-2.5.3-3.8c.9-4.6,3.8-8.8,7.2-11.2,3.7-2.5,9.9-3.6,13.7-2.9,6.7,1.2,12.6,6.2,14.6,12.2.5,1.5,1,2.8,1,2.8h6.8s-.1-1.8-.4-3.3c-.3-1.3-.7-2.6-1.2-3.9-.3-.8-2.1-4.3-4.2-6.4"/>
      </svg>
      <div style={{lineHeight:1}}>
        <span style={{fontFamily:"Poppins,sans-serif",fontSize:15,fontWeight:700,color:"#fff",letterSpacing:"-0.2px"}}>Sibylla</span>
        <span style={{fontFamily:"'Open Sans',sans-serif",fontSize:13,fontWeight:300,color:"#d1e0e8",letterSpacing:"1.5px",marginLeft:5}}>Platform</span>
      </div>
    </div>
  );
}

export default Logo;
