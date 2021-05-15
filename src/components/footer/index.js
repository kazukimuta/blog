import React from 'react'

import './footer.css'
import Config from '../../config/config'

const Footer = () => {
  return (
    <footer className="footer">
      <p className="author">authored by {Config.blogAuthor}</p>
    </footer>
  )
}

export default Footer
