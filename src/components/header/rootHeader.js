import React from 'react'
import config from '../../config/config'
import './header.css'

const Header = () => (
  <div className="header">
    <div className="site-heading">
      <h1 className="blog-title">{config.blogTitle}</h1>
      <span className="subheading">{config.blogDescription}</span>
    </div>
  </div>
)

export default Header
