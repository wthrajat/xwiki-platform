/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
package org.xwiki.whatsnew;

import java.util.List;

import org.xwiki.component.annotation.Role;
import org.xwiki.stability.Unstable;

/**
 * Configuration options for the What's New extension.
 *
 * @version $Id$
 * @since 15.1RC1
 */
@Unstable
@Role
public interface NewsConfiguration
{
    /**
     * @return the default list of news sources to use, defined as a list of component hints for components implementing
     *         the {@link NewsSource} component role (e.g. {@code xwikiblog} for the XWiki Blog news source)
     */
    List<String> getNewsSourceHints();

    /**
     * @return the time after which a check for new news should be performed
     */
    long getNewsRefreshRate();

    /**
     * @return the maximum number of news items to display at once
     */
    int getNewsDisplayCount();
}
