import React from 'react'
import PropTypes from 'prop-types'
import { StaticQuery, graphql } from 'gatsby'

import RootHeader from '../header/rootHeader'
import PageHeader from '../header/pageHeader'
import Footer from '../footer/index'


const Layout = ({ frontmatter, isRoot, children }) => (
  <StaticQuery
    query={graphql`
      query SiteTitleQuery {
        site {
          siteMetadata {
            title
          }
        }
      }
    `}
    render={data => (
      <>
        {isRoot ? <RootHeader /> : <PageHeader frontmatter={frontmatter} />}
        <div
          style={{
            margin: `0 auto`,
            maxWidth: 760,
            padding: `0px 1rem 1rem`,
            paddingTop: 0,
          }}
        >
          {children}
          <Footer />
        </div>
      </>
    )}
  />
)

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  frontmatter: PropTypes.object,
  isRoot: PropTypes.bool,
}

Layout.defaultProps = {
  isRoot: false,
}

export default Layout
