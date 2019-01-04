import { Link } from 'gatsby'
import PropTypes from 'prop-types'
import React from 'react'
import './header.css'
import Confing from '../../config/config'

const Header = ({ frontmatter }) => (
  <div className="header">
    <div className="post-header-root">
      <Link to="/" className="title-anchor">
        <h3 className="blog-title">{Confing.blogTitle}</h3>
      </Link>
      <div className="site-heading">
        <h2>{frontmatter.title}</h2>
        <span className="subheading">{frontmatter.date}</span>
      </div>
    </div>
  </div>
)

Header.propTypes = {
  frontmatter: PropTypes.object,
}

Header.defaultProps = {
  frontmatter: {},
}

export default Header
