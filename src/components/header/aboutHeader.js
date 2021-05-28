import PropTypes from 'prop-types'
import React from 'react'

const Header = ({ frontmatter }) => (
  <div className="article-header">
    <div className="container">
      <div className="container-text">
        <h1>Hello🌈 I'm Kazuki Muta</h1>
        {/* <span className="subheading">{frontmatter.date}</span> */}
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
