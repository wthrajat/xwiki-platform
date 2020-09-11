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
package org.xwiki.user.internal;

import javax.inject.Named;
import javax.inject.Singleton;

import org.xwiki.component.annotation.Component;
import org.xwiki.user.UserReference;

/**
 * Finds the Current User Reference Resolver based on the configured User store hint.
 *
 * @version $Id$
 * @since 12.8RC1
 */
@Component
@Named("current")
@Singleton
public class CurrentConfiguredStringUserReferenceResolver extends AbstractConfiguredStringUserReferenceResolver
{
    @Override
    public UserReference resolve(String userName, Object... parameters)
    {
        // By convention, each store must provide a Current User Reference Resolver suffixed by the kind of store.
        // For instance, the current store of the document store is "current/document".
        return resolve(String.format("current/%s", this.userConfiguration.getStoreHint()), userName, parameters);
    }
}
